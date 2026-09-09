import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus, RefreshCcw, Printer, CheckCircle2, XCircle, Clock,
  Search, Trash2, Globe, DollarSign, MoreVertical, Eye,
  Building2, Landmark, FileText, Loader2, ArrowUpRight,
} from 'lucide-react';
import { sendEmailNotification } from '../utils/cslNotificationUtils';
import { generateOffshoreInvoicePdf, OffshoreInvoiceData } from '../utils/cslOffshoreInvoicePdf';

const EMPTY_FORM: Partial<OffshoreInvoiceData> = {
  company: 'PT Bumi Grafika Jaya',
  paid_to: '',
  payment_method: 'TT_TRANSFER',
  account_code: '',
  payment_description: '',
  payment_fee_note: '',
  foreign_currency: 'USD',
  foreign_amount: 0,
  bank_name: '',
  account_name: '',
  bank_code: '',
  swift_code: '',
  account_number_foreign: '',
  account_number_usd: '',
  request_date: new Date().toISOString().split('T')[0],
  note: '',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_APPROVAL: 'border-amber-500/25 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium',
  APPROVED:         'border-blue-500/25 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-medium',
  PAID:             'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium',
  REJECTED:         'border-rose-500/25 text-rose-700 dark:text-rose-300 bg-rose-500/10 font-medium',
  OVERDUE:          'border-rose-500/25 text-rose-700 dark:text-rose-300 bg-rose-500/10 font-medium',
  DRAFT:            'border-zinc-500/25 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 font-medium',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED:         'Approved',
  PAID:             'Paid',
  REJECTED:         'Rejected',
  OVERDUE:          'Overdue',
  DRAFT:            'Draft',
};

const formatStatusText = (status: string) => {
  if (!status) return '';
  return STATUS_LABEL[status] || status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const CURRENCY_FLAGS: Record<string, string> = {
  IDR: '🇮🇩', USD: '🇺🇸', EUR: '🇪🇺', SGD: '🇸🇬', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', HKD: '🇭🇰',
};

const formatForeign = (currency: string, amount: number) => {
  if (currency === 'IDR') {
    return `IDR ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount)}`;
  }
  return `${currency} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(amount)}`;
};

const formatAmountSummary = (invList: OffshoreInvoiceData[]) => {
  if (!invList || invList.length === 0) return '0.00';
  const totalsByCurrency: Record<string, number> = {};
  invList.forEach(inv => {
    const cur = inv.foreign_currency || 'USD';
    totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + (Number(inv.foreign_amount) || 0);
  });
  return Object.entries(totalsByCurrency)
    .map(([cur, amt]) => {
      if (cur === 'IDR') {
        return `IDR ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amt)}`;
      }
      return `${cur} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt)}`;
    })
    .join(' • ');
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Label helper
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
    {children}
  </label>
);

export const CSLOffshoreInvoice: React.FC<{ currentUser: UserAccount | null }> = ({ currentUser }) => {
  const [invoices, setInvoices] = useState<OffshoreInvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<Partial<OffshoreInvoiceData>>(EMPTY_FORM);
  const [selected, setSelected] = useState<OffshoreInvoiceData | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'delete' | 'pay' | null>(null);
  const [viewingDetail, setViewingDetail] = useState<OffshoreInvoiceData | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [designatedApproverEmail, setDesignatedApproverEmail] = useState<string>(
    localStorage.getItem('csl_offshore_approver') || 'natalia@gesit.co.id'
  );

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.voucher_number?.toLowerCase().includes(q) ||
        inv.paid_to?.toLowerCase().includes(q) ||
        inv.payment_description?.toLowerCase().includes(q) ||
        inv.prepared_by_name?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [invoices, searchTerm, statusFilter]);

  const roleLower = (currentUser?.role || '').trim().toLowerCase();
  const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'owner';
  const isAdmin = isSuperAdmin || roleLower === 'admin' || (currentUser?.groups || []).some(g => g.toLowerCase().includes('admin'));

  // Only the designated approver can approve/reject/pay
  const isDesignatedApprover = useMemo(() => {
    if (!currentUser?.email || !designatedApproverEmail) return false;
    return currentUser.email.trim().toLowerCase() === designatedApproverEmail.trim().toLowerCase();
  }, [currentUser, designatedApproverEmail]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data, error }, { data: sysSettings }] = await Promise.all([
        supabase.from('csl_offshore_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('csl_system_settings').select('setting_value').eq('setting_key', 'csl_offshore_approver').maybeSingle()
      ]);

      if (error) {
        if (error.code === '42P01') {
          setInvoices([]);
        } else {
          toast.error('Gagal memuat data: ' + error.message);
        }
        return;
      }
      if (data) setInvoices(data as OffshoreInvoiceData[]);
      if (sysSettings?.setting_value) {
        setDesignatedApproverEmail(sysSettings.setting_value);
        localStorage.setItem('csl_offshore_approver', sysSettings.setting_value);
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const generateInvoiceNumber = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `INV-OFF-${now.getFullYear()}${pad(now.getMonth() + 1)}-${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  };

  const generateVoucherNumber = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `KK-${now.getFullYear()}${pad(now.getMonth() + 1)}-${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let attachmentId = null;

      if (attachmentFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(attachmentFile);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });

        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
          body: {
            fileName: `[Offshore_Inv] ${attachmentFile.name}`,
            fileMimeType: attachmentFile.type || 'application/pdf',
            fileBase64: base64,
            requesterEmail: currentUser?.email,
            folderType: 'document'
          }
        });

        if (uploadError || !uploadData?.success) {
          throw new Error('Gagal mengupload lampiran ke Google Drive.');
        }
        attachmentId = uploadData.fileId;
      }

      const payload = {
        ...form,
        invoice_number: form.invoice_number || generateInvoiceNumber(),
        voucher_number: generateVoucherNumber(),
        prepared_by_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
        prepared_by_id: currentUser?.id ? String(currentUser.id) : null,
        status: 'PENDING_APPROVAL',
        invoice_attachment_id: attachmentId,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('csl_offshore_invoices').insert([payload]);
      
      if (error) {
        if (error.code === '42P01') {
           throw new Error('Table csl_offshore_invoices does not exist yet. Please run migration.');
        }
        throw error;
      }
      
      toast.success('Offshore Invoice berhasil disubmit!');
      setIsFormOpen(false);
      setForm(EMPTY_FORM);
      setAttachmentFile(null);
      fetchData();
      
      let approverEmail = 'natalia@gesit.co.id';
      try {
        const { data: sysSettings, error: sysErr } = await supabase.from('csl_system_settings').select('setting_value').eq('setting_key', 'csl_offshore_approver').maybeSingle();
        if (!sysErr && sysSettings?.setting_value) {
          approverEmail = sysSettings.setting_value.trim();
        } else {
          const saved = localStorage.getItem('csl_offshore_approver');
          if (saved && saved.trim()) approverEmail = saved.trim();
        }
      } catch {}
      if (approverEmail) {
        await sendEmailNotification(
          approverEmail,
          `[CSL] Offshore Invoice Baru – Perlu Approval: ${payload.invoice_number}`,
          `Halo,\n\nAda Offshore Invoice baru yang memerlukan persetujuan Anda sebelum diproses pembayarannya.\n\nNo Invoice : ${payload.invoice_number}\nDibayarkan ke : ${payload.paid_to}\nJumlah : ${formatForeign(payload.foreign_currency, payload.foreign_amount || 0)}\nKeterangan : ${payload.payment_description}\nDiajukan oleh : ${payload.prepared_by_name}\n\nSilakan login ke CSL System untuk menyetujui atau menolak invoice ini.\n\nTerima kasih.`
        );
      }
    } catch (err: any) {
      toast.error('Gagal submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (actionStatus: string, successMsg: string) => {
    if (!selected) return;
    const updatePayload: Record<string, any> = { status: actionStatus };
    // Only stamp approved_by when approving or paying (not rejecting with a different person)
    if (actionStatus === 'APPROVED' || actionStatus === 'PAID') {
      updatePayload.approved_by_name = currentUser?.fullName || currentUser?.email;
      updatePayload.approved_by_id   = currentUser?.id;
    }
    const { error } = await supabase.from('csl_offshore_invoices').update(updatePayload).eq('id', selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success(successMsg);
    // Notify submitter when rejected
    if (actionStatus === 'REJECTED' && selected.prepared_by_id) {
      await sendEmailNotification(
        selected.prepared_by_name || '',
        `[CSL] Offshore Invoice Ditolak: ${selected.invoice_number}`,
        `Invoice ${selected.invoice_number} kepada ${selected.paid_to} senilai ${formatForeign(selected.foreign_currency, selected.foreign_amount)} telah DITOLAK oleh Admin.\n\nSilakan login ke CSL System untuk meninjau dan revisi.`
      );
    }
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  const handleDelete = async () => {
    if (!selected) return;
    const { error } = await supabase.from('csl_offshore_invoices').delete().eq('id', selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Invoice berhasil dihapus!');
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  const totalInvoices     = invoices.length;
  const totalNeedApproval = invoices.filter(i => i.status === 'PENDING_APPROVAL').length;
  const totalApproved     = invoices.filter(i => i.status === 'APPROVED').length;
  const totalPaid         = invoices.filter(i => i.status === 'PAID').length;

  const kpiCards = [
    { label: 'Total invoices', value: totalInvoices, Icon: Globe, iconBg: 'bg-zinc-100 dark:bg-zinc-800', iconColor: 'text-zinc-600 dark:text-zinc-400' },
    { label: 'Pending approval', value: totalNeedApproval, Icon: Clock, iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-600' },
    { label: 'Approved – awaiting payment', value: totalApproved, Icon: CheckCircle2, iconBg: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-600' },
    { label: 'Settled / paid', value: totalPaid, Icon: DollarSign, iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600' },
  ];

  const statusFilterOptions = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING_APPROVAL', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'PAID', label: 'Paid' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">

      {/* â”€â”€ Page Header â”€â”€ */}
      <PageHeader
        title="Offshore Invoice Payment"
        description="Manage and track international payment obligations to offshore companies and foreign legal counsel"
      >
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => generateOffshoreInvoicePdf(invoices.filter(e => selectedIds.includes(e.id)))} className="h-9 text-xs gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print {selectedIds.length} voucher{selectedIds.length > 1 ? 's' : ''}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={fetchData} className="h-9 text-xs gap-1.5">
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setForm({ ...EMPTY_FORM, invoice_number: generateInvoiceNumber() }); setIsFormOpen(true); }} className="h-9 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add invoice
          </Button>
        </div>
      </PageHeader>

      {/* SLA Stat Cards — Informative with Financial Volume & Currency Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Invoices',
            value: totalInvoices,
            amount: formatAmountSummary(invoices),
            icon: Globe,
            sub: 'Total international obligations',
          },
          {
            label: 'Pending Approval',
            value: totalNeedApproval,
            amount: formatAmountSummary(invoices.filter(i => i.status === 'PENDING_APPROVAL')),
            icon: Clock,
            sub: 'Awaiting manager approval',
          },
          {
            label: 'Approved',
            value: totalApproved,
            amount: formatAmountSummary(invoices.filter(i => i.status === 'APPROVED')),
            icon: CheckCircle2,
            sub: 'Ready for TT payment',
          },
        ].map(({ label, value, amount, icon: Icon, sub }) => (
          <div key={label} className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <Icon size={16} className="text-muted-foreground" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
                <span className="text-xs text-muted-foreground">Invoice{value !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs font-semibold font-mono text-foreground mt-1 truncate" title={amount}>
                {amount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar — same pattern as Request / Ticketing */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoice, company, description..."
              className="pl-9 h-9 text-sm rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Shadcn Tabs style for status */}
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-auto overflow-x-auto">
            {statusFilterOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  statusFilter === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
        {/* Table Card Header */}
        <div className="px-6 py-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-card">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Offshore Invoices</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Manage and track international payment obligations</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 border border-border/50 px-2.5 py-1 rounded-md">
              {filteredInvoices.length} Invoice{filteredInvoices.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading invoices…</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 text-center">
            <Globe className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No invoices found.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/40">
                <TableHead className="w-10 pl-5">
                  <input type="checkbox" className="rounded border-border"
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? filteredInvoices.map(x => x.id) : [])}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Invoice / Voucher</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Company / Paid to</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Description</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Status</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80 text-right pr-5">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map(inv => {
                const flag = CURRENCY_FLAGS[inv.foreign_currency] || '🌐';
                return (
                  <TableRow key={inv.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setViewingDetail(inv)}>
                    <TableCell className="pl-5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-border"
                        checked={selectedIds.includes(inv.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, inv.id]);
                          else setSelectedIds(selectedIds.filter(id => id !== inv.id));
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs font-semibold text-foreground">{inv.invoice_number}</p>
                      <p className="text-xs text-foreground/75 font-mono mt-0.5">{inv.voucher_number || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground max-w-[180px] truncate">{inv.paid_to}</p>
                      <p className="text-xs text-foreground/75">{inv.company}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-foreground max-w-[200px] truncate">{inv.payment_description}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-foreground whitespace-nowrap">
                        {flag} {formatForeign(inv.foreign_currency, inv.foreign_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] px-2 py-0.5 rounded-md border ${STATUS_STYLE[inv.status || 'DRAFT']}`}>
                        {formatStatusText(inv.status || 'DRAFT')}
                      </Badge>
                      {inv.approved_by_name && (inv.status === 'APPROVED' || inv.status === 'PAID') && (
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {inv.approved_by_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-5" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" />}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setViewingDetail(inv)} className="gap-2 text-xs">
                            <Eye className="h-3.5 w-3.5" /> View detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateOffshoreInvoicePdf([inv])} className="gap-2 text-xs">
                            <Printer className="h-3.5 w-3.5" /> Print cash voucher
                          </DropdownMenuItem>

                          {isDesignatedApprover && inv.status === 'PENDING_APPROVAL' && (<>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelected(inv); setConfirmAction('approve'); }} className="gap-2 text-xs text-emerald-600 focus:text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelected(inv); setConfirmAction('reject'); }} className="gap-2 text-xs text-rose-600 focus:text-rose-600">
                              <XCircle className="h-3.5 w-3.5" /> Reject invoice
                            </DropdownMenuItem>
                          </>)}

                          {isDesignatedApprover && inv.status === 'APPROVED' && (<>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelected(inv); setConfirmAction('pay'); }} className="gap-2 text-xs text-blue-600 focus:text-blue-600">
                              <DollarSign className="h-3.5 w-3.5" /> Mark as paid
                            </DropdownMenuItem>
                          </>)}

                          {isSuperAdmin && (<>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelected(inv); setConfirmAction('delete'); }} className="gap-2 text-xs text-rose-600 focus:text-rose-600">
                              <Trash2 className="h-3.5 w-3.5" /> Delete invoice
                            </DropdownMenuItem>
                          </>)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Register Invoice Dialog
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/40">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <DialogTitle className="text-base font-semibold">Register new offshore invoice</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground ml-9">
              Fill in the payment details. A cash voucher PDF will be generated automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Company *</FieldLabel>
                <Input required value={form.company || ''} onChange={e => setForm({ ...form, company: e.target.value })} className="h-9 text-sm" />
              </div>
              <div>
                <FieldLabel>Paid to (vendor name) *</FieldLabel>
                <Input required value={form.paid_to || ''} onChange={e => setForm({ ...form, paid_to: e.target.value })} className="h-9 text-sm" placeholder="e.g. Tricor Services Limited" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel>Payment method *</FieldLabel>
                <select required value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="TUNAI">Tunai</option>
                  <option value="GIRO">Giro</option>
                  <option value="CEK_TUNAI">Cek tunai</option>
                  <option value="TT_TRANSFER">T.T / Transfer</option>
                </select>
              </div>
              <div>
                <FieldLabel>Request date *</FieldLabel>
                <Input required type="date" value={form.request_date?.split('T')[0] || ''} onChange={e => setForm(prev => ({ ...prev, request_date: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <FieldLabel>Account code</FieldLabel>
                <Input value={form.account_code || ''} onChange={e => setForm({ ...form, account_code: e.target.value })} className="h-9 text-sm" placeholder="e.g. AC063994" />
              </div>
            </div>

            <div>
              <FieldLabel>Payment description *</FieldLabel>
              <textarea required rows={2} value={form.payment_description || ''} onChange={e => setForm({ ...form, payment_description: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="e.g. Payment Fee Note No. AC063994" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel>Currency *</FieldLabel>
                <select required value={form.foreign_currency} onChange={e => setForm({ ...form, foreign_currency: e.target.value })}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring">
                  {['IDR', 'USD', 'SGD', 'HKD', 'EUR', 'GBP', 'JPY', 'AUD'].map(c => (
                    <option key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <FieldLabel>Amount *</FieldLabel>
                <Input required type="number" step="0.01" value={form.foreign_amount || ''} onChange={e => setForm({ ...form, foreign_amount: parseFloat(e.target.value) })} className="h-9 text-sm font-mono" placeholder="461.00" />
              </div>
            </div>

            <div className="border border-border/50 rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                <Landmark className="h-3.5 w-3.5" /> Bank details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FieldLabel>Bank name *</FieldLabel>
                  <Input required value={form.bank_name || ''} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="h-8 text-xs" placeholder="Standard Chartered Bank (Hong Kong) Limited" />
                </div>
                <div>
                  <FieldLabel>Account name *</FieldLabel>
                  <Input required value={form.account_name || ''} onChange={e => setForm({ ...form, account_name: e.target.value })} className="h-8 text-xs" placeholder="Tricor Services Limited" />
                </div>
                <div>
                  <FieldLabel>Bank code</FieldLabel>
                  <Input value={form.bank_code || ''} onChange={e => setForm({ ...form, bank_code: e.target.value })} className="h-8 text-xs font-mono" placeholder="003" />
                </div>
                <div>
                  <FieldLabel>Swift code</FieldLabel>
                  <Input value={form.swift_code || ''} onChange={e => setForm({ ...form, swift_code: e.target.value })} className="h-8 text-xs font-mono" placeholder="SCBLHKHH" />
                </div>
                <div>
                  <FieldLabel>A/C No. (Foreign)</FieldLabel>
                  <Input value={form.account_number_foreign || ''} onChange={e => setForm({ ...form, account_number_foreign: e.target.value })} className="h-8 text-xs font-mono" placeholder="5667683-10351" />
                </div>
                <div>
                  <FieldLabel>A/C No. (USD)</FieldLabel>
                  <Input value={form.account_number_usd || ''} onChange={e => setForm({ ...form, account_number_usd: e.target.value })} className="h-8 text-xs font-mono" placeholder="447-190-92070" />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>Payment fee note</FieldLabel>
              <Input value={form.payment_fee_note || ''} onChange={e => setForm({ ...form, payment_fee_note: e.target.value })} className="h-9 text-sm" placeholder="Additional notes for bank fees…" />
            </div>

            <div>
              <FieldLabel>Attachment (invoice / supporting doc)</FieldLabel>
              <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-border/60 rounded-lg cursor-pointer hover:border-foreground/40 hover:bg-muted/20 transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  {attachmentFile
                    ? <p className="text-xs font-medium truncate">{attachmentFile.name}</p>
                    : <p className="text-xs text-muted-foreground">Click to upload PDF / image…</p>
                  }
                </div>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={e => setAttachmentFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            <DialogFooter className="pt-4 border-t border-border/40 gap-2 flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="h-9 text-xs">Cancel</Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="h-9 text-xs gap-1.5">
                {isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</> : 'Register invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────
          Invoice Detail Dialog
      ────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!viewingDetail} onOpenChange={(open) => !open && setViewingDetail(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <DialogTitle className="text-base font-semibold font-mono">{viewingDetail?.invoice_number}</DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground ml-9">
                  Voucher: <span className="font-mono font-medium">{viewingDetail?.voucher_number || '—'}</span>
                </DialogDescription>
              </div>
              {viewingDetail?.status && (
                <Badge variant="outline" className={`text-[11px] px-2.5 py-1 rounded-md border ${STATUS_STYLE[viewingDetail.status]}`}>
                  {formatStatusText(viewingDetail.status)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="col-span-2 border-border/40 shadow-none">
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Amount</p>
                  <p className="text-2xl font-semibold font-mono">
                    {viewingDetail ? formatForeign(viewingDetail.foreign_currency, viewingDetail.foreign_amount) : '-'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {viewingDetail?.foreign_currency} - {viewingDetail?.payment_method?.replace('_', '/')}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/40 shadow-none">
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Date</p>
                  <p className="text-sm font-semibold">
                    {viewingDetail?.request_date ? new Date(viewingDetail.request_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </p>
                  {viewingDetail?.account_code && (
                    <p className="text-[11px] font-mono text-muted-foreground mt-1">{viewingDetail.account_code}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment details */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Payment details
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Company</p>
                  <p className="font-medium">{viewingDetail?.company}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Paid to</p>
                  <p className="font-medium">{viewingDetail?.paid_to}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Description</p>
                  <p className="text-sm leading-relaxed">{viewingDetail?.payment_description}</p>
                </div>
                {viewingDetail?.payment_fee_note && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Fee note</p>
                    <p className="text-sm">{viewingDetail.payment_fee_note}</p>
                  </div>
                )}
                {viewingDetail?.prepared_by_name && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Prepared by</p>
                    <p className="text-sm">{viewingDetail.prepared_by_name}</p>
                  </div>
                )}
                {viewingDetail?.approved_by_name && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Approved by</p>
                    <p className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {viewingDetail.approved_by_name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details */}
            <div className="border border-border/40 rounded-lg p-4 bg-muted/10">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5" /> Bank details
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Bank name</p>
                  <p className="font-medium">{viewingDetail?.bank_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Account name</p>
                  <p className="font-medium">{viewingDetail?.account_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Bank code</p>
                  <p className="font-mono font-medium">{viewingDetail?.bank_code || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Swift code</p>
                  <p className="font-mono font-medium">{viewingDetail?.swift_code || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">A/C ({viewingDetail?.foreign_currency})</p>
                  <p className="font-mono font-medium">{viewingDetail?.account_number_foreign || '-'}</p>
                </div>
                {viewingDetail?.account_number_usd && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">A/C (USD)</p>
                    <p className="font-mono font-medium">{viewingDetail.account_number_usd}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attachment */}
            {viewingDetail?.invoice_attachment_id && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <a href={`https://drive.google.com/file/d/${viewingDetail.invoice_attachment_id}/view`} target="_blank" rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:text-muted-foreground flex items-center gap-1">
                  View attachment <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Inline approver actions */}
            {isDesignatedApprover && viewingDetail?.status === 'PENDING_APPROVAL' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => { setSelected(viewingDetail); setViewingDetail(null); setConfirmAction('approve'); }}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => { setSelected(viewingDetail); setViewingDetail(null); setConfirmAction('reject'); }}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            )}
            {isDesignatedApprover && viewingDetail?.status === 'APPROVED' && (
              <div className="pt-1">
                <Button size="sm" className="h-8 text-xs gap-1.5"
                  onClick={() => { setSelected(viewingDetail); setViewingDetail(null); setConfirmAction('pay'); }}>
                  <DollarSign className="h-3.5 w-3.5" /> Mark as paid
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/40 gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewingDetail(null)} className="h-9 text-xs">Close</Button>
            <Button size="sm" onClick={() => generateOffshoreInvoicePdf([viewingDetail as any])} className="h-9 text-xs gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print cash voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          Confirm Action (AlertDialog)
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              {confirmAction === 'approve' && <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Approve invoice?</>}
              {confirmAction === 'reject'  && <><XCircle      className="h-5 w-5 text-rose-500"    /> Reject invoice?</>}
              {confirmAction === 'pay'     && <><DollarSign   className="h-5 w-5 text-blue-500"    /> Mark as paid?</>}
              {confirmAction === 'delete'  && <><Trash2       className="h-5 w-5 text-rose-500"    /> Delete invoice?</>}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm space-y-2 pt-1">
              {confirmAction === 'approve' && (<>
                <p>Invoice <strong>{selected?.invoice_number}</strong> kepada <strong>{selected?.paid_to}</strong> senilai <strong>{formatForeign(selected?.foreign_currency || 'USD', selected?.foreign_amount || 0)}</strong> akan disetujui.</p>
                <p className="text-muted-foreground">Status akan berubah menjadi <strong>Approved – Awaiting Payment</strong>. Pembayaran masih perlu diproses secara terpisah.</p>
              </>)}
              {confirmAction === 'reject' && (<>
                <p>Invoice <strong>{selected?.invoice_number}</strong> akan ditolak.</p>
                <p className="text-muted-foreground">Staff pengaju akan mendapat notifikasi email. Invoice dapat direvisi dan diajukan ulang.</p>
              </>)}
              {confirmAction === 'pay' && (
                <p>Invoice <strong>{selected?.invoice_number}</strong> senilai <strong>{formatForeign(selected?.foreign_currency || 'USD', selected?.foreign_amount || 0)}</strong> akan ditandai sebagai <strong>Paid</strong>.</p>
              )}
              {confirmAction === 'delete' && (
                <p>Invoice <strong>{selected?.invoice_number}</strong> akan dihapus secara permanen. Data tidak dapat dikembalikan.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === 'approve') handleAction('APPROVED', `Invoice ${selected?.invoice_number} berhasil disetujui.`);
                else if (confirmAction === 'reject')  handleAction('REJECTED', `Invoice ${selected?.invoice_number} telah ditolak.`);
                else if (confirmAction === 'pay')     handleAction('PAID', `Invoice ${selected?.invoice_number} berhasil ditandai sebagai Paid.`);
                else if (confirmAction === 'delete')  handleDelete();
              }}
              className={
                confirmAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                confirmAction === 'pay'     ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-rose-600 hover:bg-rose-700'
              }
            >
              {confirmAction === 'approve' ? 'Ya, setujui' :
               confirmAction === 'reject'  ? 'Ya, tolak' :
               confirmAction === 'pay'     ? 'Ya, tandai paid' :
               'Ya, hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

