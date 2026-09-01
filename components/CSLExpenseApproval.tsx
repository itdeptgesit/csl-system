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
import { Plus, RefreshCcw, Printer, CheckCircle2, XCircle, Clock, FileText, ChevronDown, ChevronUp, Search, Trash2 } from 'lucide-react';
import { sendEmailNotification } from '../utils/cslNotificationUtils';
import { generateExpenseApprovalPdf } from '../utils/cslExpensePdf';

interface ExpenseApproval {
  id: string;
  expense_number: string;
  company: string;
  department: string;
  project_name: string;
  request_date: string;
  paid_to: string;
  note: string;
  total_amount: number;
  invoice_number: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  prepared_by_name: string;
  prepared_by_id: string;
  approved_by_name?: string;
  approved_by_id?: string;
  status: string;
  created_at: string;
  invoice_attachment_id?: string;
}

const EMPTY_FORM = {
  company: 'PT Bumi Grafika Jaya',
  department: 'CSL',
  project_name: '',
  request_date: new Date().toISOString().split('T')[0],
  paid_to: '',
  note: '',
  total_amount: '',
  invoice_number: '',
  bank_name: '',
  account_number: '',
  account_name: '',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  DISBURSED: 'bg-blue-100 text-blue-700',
};

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export const CSLExpenseApproval: React.FC<{ currentUser: UserAccount | null }> = ({ currentUser }) => {
  const [expenses, setExpenses] = useState<ExpenseApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState<ExpenseApproval | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [viewingDetail, setViewingDetail] = useState<ExpenseApproval | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        e.expense_number?.toLowerCase().includes(q) ||
        e.project_name?.toLowerCase().includes(q) ||
        e.paid_to?.toLowerCase().includes(q) ||
        e.prepared_by_name?.toLowerCase().includes(q) ||
        e.invoice_number?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [expenses, searchTerm, statusFilter]);

  const roleLower = (currentUser?.role || '').trim().toLowerCase();
  
  const isSuperAdmin = useMemo(() => {
    return roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'owner';
  }, [roleLower]);

  const isAdmin = useMemo(() => {
    return isSuperAdmin || roleLower === 'admin' || (currentUser?.groups || []).some(g => g.toLowerCase().includes('admin'));
  }, [roleLower, isSuperAdmin, currentUser]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('csl_expense_approvals')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setExpenses(data);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const ROMAN_MONTHS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

  const generateInvoiceNumber = async (): Promise<string> => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    const year  = now.getFullYear();
    const roman = ROMAN_MONTHS[month];

    // Count existing invoices this month to get next sequence
    try {
      const monthStart = new Date(year, month, 1).toISOString();
      const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const { count } = await supabase
        .from('csl_expense_approvals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      const seq = String((count || 0) + 1).padStart(3, '0');
      return `${seq}/INV/${roman}/${year}`;
    } catch {
      return `001/INV/${roman}/${year}`;
    }
  };

  const generateNumber = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `EXP-${now.getFullYear()}${pad(now.getMonth() + 1)}-${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let attachmentId = null;

      if (attachmentFile) {
        // Upload to Google Drive via Edge Function
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(attachmentFile);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });

        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
          body: {
            fileName: `[Invoice_Exp] ${attachmentFile.name}`,
            fileMimeType: attachmentFile.type || 'application/pdf',
            fileBase64: base64,
            requesterEmail: currentUser.email,
            folderType: 'document'
          }
        });

        if (uploadError || !uploadData?.success) {
          throw new Error('Gagal mengupload lampiran invoice ke Google Drive.');
        }
        attachmentId = uploadData.fileId;
      }

      const payload = {
        ...form,
        total_amount: Number(String(form.total_amount).replace(/\D/g, '')),
        expense_number: generateNumber(),
        prepared_by_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
        prepared_by_id: currentUser?.id,
        status: 'PENDING_APPROVAL',
        invoice_attachment_id: attachmentId
      };
      const { error } = await supabase.from('csl_expense_approvals').insert([payload]);
      if (error) throw error;
      toast.success('Expenses Approval berhasil disubmit!');
      setIsFormOpen(false);
      setForm(EMPTY_FORM);
      setAttachmentFile(null);
      fetchData();
      // Notify approver by email
      await sendEmailNotification(
        'nata@gesit.co.id',
        `[CSL] Expenses Approval Baru: ${payload.expense_number}`,
        `Halo,\n\nAda Expenses Approval baru yang memerlukan persetujuan Anda.\n\nNo: ${payload.expense_number}\nProject: ${payload.project_name}\nDibayarkan ke: ${payload.paid_to}\nTotal: ${formatRp(payload.total_amount)}\n\nSilakan login ke CSL System untuk menyetujui atau menolak.\n\nTerima kasih.`
      );
    } catch (err: any) {
      toast.error('Gagal submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    const { error } = await supabase.from('csl_expense_approvals').update({
      status: 'APPROVED',
      approved_by_name: currentUser?.fullName || currentUser?.email,
      approved_by_id: currentUser?.id,
    }).eq('id', selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense disetujui!');
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  const handleReject = async () => {
    if (!selected) return;
    const { error } = await supabase.from('csl_expense_approvals').update({
      status: 'REJECTED',
      approved_by_name: currentUser?.fullName || currentUser?.email,
      approved_by_id: currentUser?.id,
    }).eq('id', selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense ditolak.');
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  const handleDelete = async () => {
    if (!selected) return;
    const { error } = await supabase.from('csl_expense_approvals').delete().eq('id', selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Pengajuan berhasil dihapus!');
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <PageHeader title="Expenses Approval" description="Pengajuan dan persetujuan biaya operasional CSL">
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button size="sm" onClick={() => generateExpenseApprovalPdf(expenses.filter(e => selectedIds.includes(e.id)) as any)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
              <Printer className="h-4 w-4 mr-1.5" /> Cetak {selectedIds.length} Terpilih
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={async () => {
            const invNum = await generateInvoiceNumber();
            setForm({ ...EMPTY_FORM, invoice_number: invNum });
            setIsFormOpen(true);
          }} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
            <Plus className="h-4 w-4 mr-1.5" /> Buat Pengajuan
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending */}
        <div className="border rounded-xl p-4 text-amber-700 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Pending</p>
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-amber-100 text-amber-600"><Clock className="h-4 w-4" /></span>
          </div>
          <p className="text-3xl font-black mt-1">{expenses.filter(e => e.status === 'PENDING_APPROVAL').length}</p>
          <p className="text-[10px] font-medium mt-1 opacity-60">{formatRp(expenses.filter(e => e.status === 'PENDING_APPROVAL').reduce((s, e) => s + e.total_amount, 0))}</p>
        </div>
        {/* Approved */}
        <div className="border rounded-xl p-4 text-emerald-700 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Approved</p>
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></span>
          </div>
          <p className="text-3xl font-black mt-1">{expenses.filter(e => e.status === 'APPROVED').length}</p>
          <p className="text-[10px] font-medium mt-1 opacity-60">{formatRp(expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + e.total_amount, 0))}</p>
        </div>
        {/* Disbursed */}
        <div className="border rounded-xl p-4 text-blue-700 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Disbursed</p>
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-100 text-blue-600"><FileText className="h-4 w-4" /></span>
          </div>
          <p className="text-3xl font-black mt-1">{expenses.filter(e => e.status === 'DISBURSED').length}</p>
          <p className="text-[10px] font-medium mt-1 opacity-60">{formatRp(expenses.filter(e => e.status === 'DISBURSED').reduce((s, e) => s + e.total_amount, 0))}</p>
        </div>
        {/* Total */}
        <div className="border rounded-xl p-4 text-indigo-700 bg-indigo-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Pengajuan</p>
            <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><Printer className="h-4 w-4" /></span>
          </div>
          <p className="text-3xl font-black mt-1">{expenses.length}</p>
          <p className="text-[10px] font-medium mt-1 opacity-60">{formatRp(expenses.reduce((s, e) => s + e.total_amount, 0))}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari no. pengajuan, project, vendor, invoice..."
            className="pl-9 h-9 text-sm rounded-xl bg-muted/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-xs font-bold rounded-xl border border-border/40 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px]"
        >
          <option value="ALL">Semua Status</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DISBURSED">Disbursed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/10 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-muted-foreground gap-3">
            <RefreshCcw className="animate-spin h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Loading...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground/50 text-xs font-bold uppercase tracking-widest">
            {searchTerm || statusFilter !== 'ALL' ? 'Tidak ada hasil ditemukan.' : 'Belum ada pengajuan.'}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? filteredExpenses.map(x => x.id) : [])}
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">No. Pengajuan</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Project & Vendor</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Total & Invoice</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Bank</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Dibuat oleh</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map(exp => (
                <React.Fragment key={exp.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setViewingDetail(exp)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.includes(exp.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, exp.id]);
                          else setSelectedIds(selectedIds.filter(id => id !== exp.id));
                        }}
                      />
                    </TableCell>
                    {/* No. Pengajuan + Tanggal */}
                    <TableCell>
                      <p className="font-mono text-xs font-bold text-indigo-600">{exp.expense_number}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(exp.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </TableCell>
                    {/* Project + Vendor */}
                    <TableCell>
                      <p className="font-bold text-sm max-w-[200px] truncate">{exp.project_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">→ {exp.paid_to}</p>
                    </TableCell>
                    {/* Total + Invoice */}
                    <TableCell>
                      <p className="font-mono text-sm font-black text-emerald-600">{formatRp(exp.total_amount)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{exp.invoice_number}</p>
                    </TableCell>
                    {/* Bank + Rekening */}
                    <TableCell>
                      <p className="text-xs font-bold">{exp.bank_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{exp.account_number}</p>
                    </TableCell>
                    {/* Dibuat oleh */}
                    <TableCell>
                      <p className="text-xs font-medium">{exp.prepared_by_name}</p>
                      {exp.approved_by_name && <p className="text-[10px] text-emerald-600 mt-0.5">✓ {exp.approved_by_name}</p>}
                    </TableCell>
                    {/* Status */}
                    <TableCell>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg whitespace-nowrap ${STATUS_STYLE[exp.status] || 'bg-zinc-100 text-zinc-600'}`}>
                        {exp.status.replace(/_/g, ' ')}
                      </span>
                      {exp.invoice_attachment_id && (
                        <p className="text-[10px] text-indigo-500 mt-1 flex items-center gap-1"><FileText className="h-2.5 w-2.5" /> Ada lampiran</p>
                      )}
                    </TableCell>
                    {/* Aksi */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={e => { e.stopPropagation(); generateExpenseApprovalPdf([exp as any]); }}
                          className="h-7 px-2 text-xs text-indigo-600"
                          title="Cetak PDF"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && exp.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button variant="ghost" size="sm"
                              onClick={e => { e.stopPropagation(); setSelected(exp); setConfirmAction('approve'); }}
                              className="h-7 px-2 text-xs text-emerald-600"
                              title="Approve"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm"
                              onClick={e => { e.stopPropagation(); setSelected(exp); setConfirmAction('reject'); }}
                              className="h-7 px-2 text-xs text-red-500"
                              title="Reject"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {isSuperAdmin && (
                          <Button variant="ghost" size="sm"
                            onClick={e => { e.stopPropagation(); setSelected(exp); setConfirmAction('delete'); }}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 ml-1"
                            title="Hapus (Super Admin Only)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}            </TableBody>
          </Table>
        )}
      </div>

      {/* ── View Detail Modal ── */}
      <Dialog open={!!viewingDetail} onOpenChange={(open) => !open && setViewingDetail(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <FileText size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Detail Pengajuan</span>
            </div>
            <DialogTitle className="text-xl font-black">{viewingDetail?.expense_number}</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Perusahaan</p><p className="font-bold">{viewingDetail?.company}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Dept.</p><p className="font-bold">{viewingDetail?.department}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Tanggal</p><p className="font-bold">{viewingDetail?.request_date ? new Date(viewingDetail.request_date).toLocaleDateString('id-ID') : '-'}</p></div>
              <div className="col-span-2 md:col-span-3"><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Project Name</p><p className="font-bold">{viewingDetail?.project_name}</p></div>
              <div className="col-span-2 md:col-span-3"><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Dibayarkan ke (Paid to)</p><p className="font-bold">{viewingDetail?.paid_to}</p></div>
              
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total Tagihan</p><p className="font-bold font-mono text-emerald-600">{viewingDetail ? formatRp(viewingDetail.total_amount) : '-'}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">No. Invoice</p><p className="font-bold font-mono">{viewingDetail?.invoice_number}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Status</p>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${viewingDetail?.status ? STATUS_STYLE[viewingDetail.status] : 'bg-zinc-100'}`}>
                  {viewingDetail?.status.replace(/_/g, ' ')}
                </span>
              </div>
              
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Bank</p><p className="font-bold">{viewingDetail?.bank_name}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">No. Rekening</p><p className="font-bold font-mono">{viewingDetail?.account_number}</p></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Atas Nama</p><p className="font-bold">{viewingDetail?.account_name}</p></div>
              
              <div><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Dibuat oleh</p><p className="font-bold">{viewingDetail?.prepared_by_name}</p></div>
              <div className="col-span-2"><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Disetujui oleh</p><p className="font-bold">{viewingDetail?.approved_by_name || '-'}</p></div>
              
              {viewingDetail?.invoice_attachment_id && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Lampiran Invoice</p>
                  <a 
                    href={`https://drive.google.com/open?id=${viewingDetail.invoice_attachment_id}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-indigo-600 font-bold hover:underline flex items-center gap-1.5"
                  >
                    <FileText className="h-4 w-4" /> Lihat Lampiran di Google Drive
                  </a>
                </div>
              )}
              
              {viewingDetail?.note && <div className="col-span-2 md:col-span-3"><p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Note</p><p className="font-medium text-muted-foreground">{viewingDetail.note}</p></div>}
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-muted/10 gap-2 flex sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setViewingDetail(null)} className="text-xs font-bold rounded-xl h-9">
              Tutup
            </Button>
            <Button size="sm" onClick={() => generateExpenseApprovalPdf([viewingDetail as any])} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
              <Printer className="h-4 w-4 mr-1.5" /> Cetak PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Form Modal ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <FileText size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Expenses Approval</span>
            </div>
            <DialogTitle className="text-xl font-black">Buat Pengajuan Biaya</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Isi form di bawah. Notifikasi akan dikirim ke approver via email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold mb-1 block">Perusahaan *</label>
                <Input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="h-9 text-sm bg-muted/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">Departemen *</label>
                <Input required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="h-9 text-sm bg-muted/30" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold mb-1 block">Nama Project *</label>
              <textarea required rows={2} value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })}
                className="w-full p-2 text-sm bg-muted/30 border border-border/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold mb-1 block">Tanggal Request *</label>
                <Input required type="date" value={form.request_date} onChange={e => setForm({ ...form, request_date: e.target.value })} className="h-9 text-sm bg-muted/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">Dibayarkan ke (Paid to) *</label>
                <Input required value={form.paid_to} onChange={e => setForm({ ...form, paid_to: e.target.value })} className="h-9 text-sm bg-muted/30" placeholder="e.g. Notaris Monica Kusumadevi" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold mb-1 block">Total Tagihan (Rp) *</label>
                <Input required type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} className="h-9 text-sm bg-muted/30 font-mono" placeholder="4602564" />
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">No. Invoice *</label>
                <Input required value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value.toUpperCase() })} className="h-9 text-sm bg-muted/30 font-mono uppercase" placeholder="020/INV/VIII/2026" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold mb-1 block">Bank *</label>
                <Input required value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="h-9 text-sm bg-muted/30" placeholder="BCA" />
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">No. Rekening *</label>
                <Input required value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} className="h-9 text-sm bg-muted/30 font-mono" placeholder="7310603141" />
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 block">Atas Nama *</label>
                <Input required value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} className="h-9 text-sm bg-muted/30" placeholder="Monica Kusuma Devi" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold mb-1 block">Note / Keterangan</label>
              <textarea rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full p-2 text-sm bg-muted/30 border border-border/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="text-[11px] font-bold mb-1 block">Lampiran Invoice (Opsional)</label>
              <div className="flex items-center gap-3">
                <Input 
                  type="file" 
                  onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                  className="rounded-xl border-gray-300 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {attachmentFile && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{attachmentFile.name}</span>}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">File akan diunggah ke Google Drive (PDF/Image).</p>
            </div>

            <DialogFooter className="pt-4 border-t gap-2 flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="text-xs font-bold rounded-xl h-9">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                {isSubmitting ? 'Mengirim...' : 'Submit Pengajuan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Approve / Reject / Delete ── */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' ? 'Setujui Pengajuan?' : 
               confirmAction === 'reject' ? 'Tolak Pengajuan?' : 'Hapus Pengajuan?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve'
                ? `Anda akan menyetujui pengajuan ${selected?.expense_number} senilai ${formatRp(selected?.total_amount || 0)}.`
                : confirmAction === 'reject'
                ? `Anda akan menolak pengajuan ${selected?.expense_number}. Tindakan ini tidak dapat dibatalkan.`
                : `Anda akan menghapus pengajuan ${selected?.expense_number}. Data yang dihapus tidak dapat dikembalikan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction === 'approve' ? handleApprove : confirmAction === 'reject' ? handleReject : handleDelete}
              className={confirmAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}
            >
              {confirmAction === 'approve' ? 'Ya, Setujui' : confirmAction === 'reject' ? 'Ya, Tolak' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
