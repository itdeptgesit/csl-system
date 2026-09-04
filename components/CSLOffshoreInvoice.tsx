import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, RefreshCcw, Printer, CheckCircle2, XCircle, Clock, FileText, Search, Trash2, Globe, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
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
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED:         'bg-blue-100 text-blue-700',
  PAID:             'bg-emerald-100 text-emerald-700',
  REJECTED:         'bg-red-100 text-red-700',
  OVERDUE:          'bg-red-100 text-red-700',
  DRAFT:            'bg-slate-100 text-slate-600',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED:         'Approved – Awaiting Payment',
  PAID:             'Paid',
  REJECTED:         'Rejected',
  OVERDUE:          'Overdue',
  DRAFT:            'Draft',
};

const CURRENCY_FLAGS: Record<string, string> = { USD: '🇺🇸', EUR: '🇪🇺', SGD: '🇸🇬', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', HKD: '🇭🇰' };

const formatForeign = (currency: string, amount: number) =>
  `${currency} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(amount)}`;

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

  const totalInvoices       = invoices.length;
  const totalNeedApproval   = invoices.filter(i => i.status === 'PENDING_APPROVAL').length;
  const totalApproved       = invoices.filter(i => i.status === 'APPROVED').length;
  const totalPaid           = invoices.filter(i => i.status === 'PAID').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      <PageHeader
        title="Offshore Invoice Payment"
        description="Manage and track payment obligations to international offshore companies and foreign legal counsel"
      >
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button size="sm" onClick={() => generateOffshoreInvoicePdf(invoices.filter(e => selectedIds.includes(e.id)))} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
              <Printer className="h-4 w-4 mr-1.5" /> Cetak {selectedIds.length} Voucher
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => {
            setForm({ ...EMPTY_FORM, invoice_number: generateInvoiceNumber() });
            setIsFormOpen(true);
          }} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> Add Invoice
          </Button>
        </div>
      </PageHeader>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total */}
        <div className="border rounded-xl p-4 text-indigo-700 bg-indigo-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Invoices</p>
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><Globe className="h-4 w-4" /></span>
          </div>
          <p className="text-3xl font-black mt-1">{totalInvoices}</p>
          <p className="text-[10px] font-medium mt-1 opacity-60">invoices registered</p>
        </div>
        {/* Need Approval */}
        <div className="border rounded-xl p-4 text-amber-700 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Need Approval</p>
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-amber-100 text-amber-600"><Clock className="h-4 w-4" /></span>
          </div>
          <p className="text-3xl font-black mt-1">{totalNeedApproval}</p>
          <p className="text-[10px] font-medium mt-1 opacity-60">awaiting admin review</p>
        </div>
        {/* Approved */}
        <div className="border rounded-xl p-4 text-blue-700 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Approved</p>
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600"><CheckCircle2 className="h-4 w-4" /></span>
          </div>
          <p className="text-3xl font-black mt-1">{totalApproved}</p>
          <p className="text-[10px] font-medium mt-1 opacity-60">ready to pay</p>
        </div>
        {/* Paid */}
        <div className="border rounded-xl p-4 text-emerald-700 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Paid</p>
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><DollarSign className="h-4 w-4" /></span>
          </div>
          <p className="text-3xl font-black mt-1">{totalPaid}</p>
          <p className="text-[10px] font-medium mt-1 opacity-60">invoice(s) settled</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by invoice no., company, description..."
            className="pl-9 h-10 text-sm rounded-xl bg-muted/30"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-card text-muted-foreground border-border/40 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {s === 'ALL' ? 'All' : STATUS_LABEL[s] || s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/10 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-muted-foreground gap-3">
            <RefreshCcw className="animate-spin h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Loading...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground/50 text-sm">
            <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            No invoices found.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? filteredInvoices.map(x => x.id) : [])}
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Invoice / Voucher No.</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Company / Paid To</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Description</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Amount (Foreign)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map(inv => {
                const flag = CURRENCY_FLAGS[inv.foreign_currency] || '🌐';
                return (
                  <TableRow key={inv.id} className="hover:bg-muted/40 group cursor-pointer" onClick={() => setViewingDetail(inv)}>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.includes(inv.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, inv.id]);
                          else setSelectedIds(selectedIds.filter(id => id !== inv.id));
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs font-bold text-indigo-600">{inv.invoice_number}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{inv.voucher_number || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-sm max-w-[180px] truncate">{inv.paid_to}</p>
                      <p className="text-[11px] text-muted-foreground">{inv.company}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{inv.payment_description}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-foreground whitespace-nowrap">
                        {flag} {formatForeign(inv.foreign_currency, inv.foreign_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg whitespace-nowrap ${STATUS_STYLE[inv.status || 'DRAFT']}`}>
                        {STATUS_LABEL[inv.status || 'DRAFT'] || inv.status}
                      </span>
                      {inv.approved_by_name && (inv.status === 'APPROVED' || inv.status === 'PAID') && (
                        <p className="text-[10px] text-muted-foreground mt-1">✓ {inv.approved_by_name}</p>
                      )}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {/* Print */}
                        <Button variant="ghost" size="sm"
                          onClick={() => generateOffshoreInvoicePdf([inv])}
                          className="h-7 px-2 text-xs text-indigo-600"
                          title="Cetak Voucher PDF"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>

                        {/* Designated Approver only: Approve / Reject when PENDING_APPROVAL */}
                        {isDesignatedApprover && inv.status === 'PENDING_APPROVAL' && (<>
                          <Button variant="ghost" size="sm"
                            onClick={() => { setSelected(inv); setConfirmAction('approve'); }}
                            className="h-7 px-2 text-xs text-emerald-600"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm"
                            onClick={() => { setSelected(inv); setConfirmAction('reject'); }}
                            className="h-7 px-2 text-xs text-red-500"
                            title="Reject"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>)}

                        {/* Designated Approver: Process Payment when APPROVED */}
                        {isDesignatedApprover && inv.status === 'APPROVED' && (
                          <Button variant="ghost" size="sm"
                            onClick={() => { setSelected(inv); setConfirmAction('pay'); }}
                            className="h-7 px-2 text-xs text-blue-600"
                            title="Process Payment"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Super Admin: Delete */}
                        {isSuperAdmin && (
                          <Button variant="ghost" size="sm"
                            onClick={() => { setSelected(inv); setConfirmAction('delete'); }}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 ml-1"
                            title="Hapus (Super Admin Only)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Submit Form Modal ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Globe size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Offshore Invoice</span>
            </div>
            <DialogTitle className="text-xl font-black">Register New Invoice</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Fill in the details for the offshore invoice and cash voucher generation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="text-[11px] font-bold mb-1 block">Company *</label>
                <Input required value={form.company || ''} onChange={e => setForm({ ...form, company: e.target.value })} className="h-9 text-sm bg-muted/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">Paid To (Vendor Name) *</label>
                <Input required value={form.paid_to || ''} onChange={e => setForm({ ...form, paid_to: e.target.value })} className="h-9 text-sm bg-muted/30" placeholder="e.g. Tricor Services Limited" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold mb-1 block">Payment Method *</label>
                <select required value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full h-9 px-3 text-sm rounded-xl border border-border/40 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="TUNAI">TUNAI</option>
                  <option value="GIRO">GIRO</option>
                  <option value="CEK_TUNAI">CEK TUNAI</option>
                  <option value="TT_TRANSFER">T.T / TRANSFER</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">Date *</label>
                <Input required type="date" value={form.request_date || ''} onChange={e => setForm({ ...form, request_date: e.target.value })} className="h-9 text-sm bg-muted/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">Account Code (Opsional)</label>
                <Input value={form.account_code || ''} onChange={e => setForm({ ...form, account_code: e.target.value })} className="h-9 text-sm bg-muted/30" placeholder="e.g. AC063994" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold mb-1 block">Payment Description *</label>
              <textarea required rows={2} value={form.payment_description || ''} onChange={e => setForm({ ...form, payment_description: e.target.value })}
                className="w-full p-2 text-sm bg-muted/30 border border-border/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Payment Fee Note No. AC063994" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold mb-1 block">Currency *</label>
                <select required value={form.foreign_currency} onChange={e => setForm({ ...form, foreign_currency: e.target.value })} className="w-full h-9 px-3 text-sm rounded-xl border border-border/40 bg-muted/30 font-mono">
                  <option value="USD">USD</option>
                  <option value="SGD">SGD</option>
                  <option value="HKD">HKD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">Foreign Amount *</label>
                <Input required type="number" step="0.01" value={form.foreign_amount || ''} onChange={e => setForm({ ...form, foreign_amount: parseFloat(e.target.value) })} className="h-9 text-sm bg-muted/30 font-mono" placeholder="461.00" />
              </div>
            </div>

            <div className="border border-border/40 p-4 rounded-xl space-y-3 bg-muted/10">
              <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500"/> Bank Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold mb-1 block">Bank Name *</label>
                  <Input required value={form.bank_name || ''} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="h-8 text-xs bg-card" placeholder="Standard Chartered Bank (Hong Kong) Limited" />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block">Account Name *</label>
                  <Input required value={form.account_name || ''} onChange={e => setForm({ ...form, account_name: e.target.value })} className="h-8 text-xs bg-card" placeholder="Tricor Services Limited" />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block">Bank Code (Opsional)</label>
                  <Input value={form.bank_code || ''} onChange={e => setForm({ ...form, bank_code: e.target.value })} className="h-8 text-xs bg-card font-mono" placeholder="003" />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block">Swift Code (Opsional)</label>
                  <Input value={form.swift_code || ''} onChange={e => setForm({ ...form, swift_code: e.target.value })} className="h-8 text-xs bg-card font-mono" placeholder="SCBLHKHH" />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block">A/C No. (Foreign) (Opsional)</label>
                  <Input value={form.account_number_foreign || ''} onChange={e => setForm({ ...form, account_number_foreign: e.target.value })} className="h-8 text-xs bg-card font-mono" placeholder="5667683-10351" />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block">A/C No. (USD) (Opsional)</label>
                  <Input value={form.account_number_usd || ''} onChange={e => setForm({ ...form, account_number_usd: e.target.value })} className="h-8 text-xs bg-card font-mono" placeholder="447-190-92070" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold mb-1 block">Payment Fee Note (Opsional)</label>
              <Input value={form.payment_fee_note || ''} onChange={e => setForm({ ...form, payment_fee_note: e.target.value })} className="h-9 text-sm bg-muted/30" placeholder="Additional notes for bank fees..." />
            </div>

            <DialogFooter className="pt-4 border-t gap-2 flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="text-xs font-bold rounded-xl h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                {isSubmitting ? 'Submitting...' : 'Register Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Detail Modal ── */}
      <Dialog open={!!viewingDetail} onOpenChange={(open) => !open && setViewingDetail(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Globe size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Offshore Invoice Detail</span>
            </div>
            <DialogTitle className="text-xl font-black">{viewingDetail?.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Voucher No.</p><p className="font-bold font-mono text-indigo-600">{viewingDetail?.voucher_number || '-'}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Company</p><p className="font-bold">{viewingDetail?.company}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Date</p><p className="font-bold">{viewingDetail?.request_date ? new Date(viewingDetail.request_date).toLocaleDateString('id-ID') : '-'}</p></div>
              <div className="col-span-2 md:col-span-3"><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Paid To</p><p className="font-bold">{viewingDetail?.paid_to}</p></div>
              <div className="col-span-2 md:col-span-3"><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Payment Description</p><p className="font-bold">{viewingDetail?.payment_description}</p></div>
              
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Foreign Amount</p><p className="font-bold font-mono text-emerald-600">{viewingDetail ? formatForeign(viewingDetail.foreign_currency, viewingDetail.foreign_amount) : '-'}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Status</p>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${viewingDetail?.status ? STATUS_STYLE[viewingDetail.status] : 'bg-zinc-100'}`}>
                  {viewingDetail?.status?.replace('_', ' ')}
                </span>
              </div>
              
              <div className="col-span-2 md:col-span-3 border-t pt-4 mt-2">
                <h5 className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Bank Details</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-2"><p className="text-[10px] text-muted-foreground mb-1">Bank Name</p><p className="font-bold">{viewingDetail?.bank_name}</p></div>
                  <div><p className="text-[10px] text-muted-foreground mb-1">Account Name</p><p className="font-bold">{viewingDetail?.account_name}</p></div>
                  <div><p className="text-[10px] text-muted-foreground mb-1">Bank Code</p><p className="font-bold font-mono">{viewingDetail?.bank_code || '-'}</p></div>
                  <div><p className="text-[10px] text-muted-foreground mb-1">Swift Code</p><p className="font-bold font-mono">{viewingDetail?.swift_code || '-'}</p></div>
                  <div><p className="text-[10px] text-muted-foreground mb-1">A/C ({viewingDetail?.foreign_currency})</p><p className="font-bold font-mono">{viewingDetail?.account_number_foreign || '-'}</p></div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-muted/10 gap-2 flex sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setViewingDetail(null)} className="text-xs font-bold rounded-xl h-9">
              Tutup
            </Button>
            <Button size="sm" onClick={() => generateOffshoreInvoicePdf([viewingDetail as any])} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
              <Printer className="h-4 w-4 mr-1.5" /> Cetak Cash Voucher (PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Approve / Reject / Delete / Pay ── */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction === 'approve' && <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Setujui Invoice?</>}
              {confirmAction === 'reject'  && <><XCircle      className="h-5 w-5 text-red-500" />     Tolak Invoice?</>}
              {confirmAction === 'pay'     && <><DollarSign   className="h-5 w-5 text-indigo-500" />  Proses Pembayaran?</>}
              {confirmAction === 'delete'  && <><Trash2       className="h-5 w-5 text-red-500" />     Hapus Invoice?</>}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm space-y-1">
              {confirmAction === 'approve' && (
                <><p>Invoice <strong>{selected?.invoice_number}</strong> kepada <strong>{selected?.paid_to}</strong> senilai <strong>{formatForeign(selected?.foreign_currency || 'USD', selected?.foreign_amount || 0)}</strong> akan disetujui.</p><p className="text-muted-foreground mt-1">Status akan berubah menjadi <strong>Approved – Awaiting Payment</strong>. Anda masih perlu memproses pembayarannya secara terpisah.</p></>
              )}
              {confirmAction === 'reject' && (
                <><p>Invoice <strong>{selected?.invoice_number}</strong> akan ditolak.</p><p className="text-muted-foreground mt-1">Staff pengaju akan mendapatkan notifikasi email. Invoice dapat direvisi dan diajukan ulang.</p></>
              )}
              {confirmAction === 'pay' && (
                <p>Invoice <strong>{selected?.invoice_number}</strong> senilai <strong>{formatForeign(selected?.foreign_currency || 'USD', selected?.foreign_amount || 0)}</strong> akan ditandai sebagai <strong>PAID</strong> (Telah Dibayar).</p>
              )}
              {confirmAction === 'delete' && (
                <p>Invoice <strong>{selected?.invoice_number}</strong> akan dihapus permanen. Data tidak dapat dikembalikan.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === 'approve') handleAction('APPROVED', `Invoice ${selected?.invoice_number} berhasil disetujui.`);
                else if (confirmAction === 'reject')  handleAction('REJECTED', `Invoice ${selected?.invoice_number} telah ditolak.`);
                else if (confirmAction === 'pay')     handleAction('PAID', `Invoice ${selected?.invoice_number} berhasil ditandai sebagai PAID.`);
                else if (confirmAction === 'delete')  handleDelete();
              }}
              className={
                confirmAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' :
                confirmAction === 'pay'     ? 'bg-indigo-600 hover:bg-indigo-500' :
                'bg-red-600 hover:bg-red-500'
              }
            >
              {confirmAction === 'approve' ? 'Ya, Setujui' :
               confirmAction === 'reject'  ? 'Ya, Tolak' :
               confirmAction === 'pay'     ? 'Ya, Tandai PAID' :
               'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
