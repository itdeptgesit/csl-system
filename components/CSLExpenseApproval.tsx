import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus, RefreshCcw, Printer, CheckCircle2, XCircle, Clock,
  Search, Trash2, Receipt, DollarSign, MoreVertical, Eye,
  Building2, Landmark, FileText, Loader2, ExternalLink
} from 'lucide-react';
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
  PENDING_APPROVAL: 'border-amber-500/25 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium',
  APPROVED:         'border-blue-500/25 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-medium',
  DISBURSED:        'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium',
  REJECTED:         'border-rose-500/25 text-rose-700 dark:text-rose-300 bg-rose-500/10 font-medium',
  DRAFT:            'border-zinc-500/25 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 font-medium',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED:         'Approved',
  DISBURSED:        'Disbursed',
  REJECTED:         'Rejected',
  DRAFT:            'Draft',
};

const formatStatusText = (status: string) => {
  if (!status) return '';
  return STATUS_LABEL[status] || status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

// ────────────────────────────────────────
// Label helper
// ────────────────────────────────────────
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
    {children}
  </label>
);

export const CSLExpenseApproval: React.FC<{ currentUser: UserAccount | null }> = ({ currentUser }) => {
  const [expenses, setExpenses] = useState<ExpenseApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState<ExpenseApproval | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'delete' | 'disburse' | null>(null);
  const [viewingDetail, setViewingDetail] = useState<ExpenseApproval | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [designatedApproverEmail, setDesignatedApproverEmail] = useState<string>(
    localStorage.getItem('csl_expense_approver') || 'natalia@gesit.co.id'
  );

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
  const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'owner';
  const isAdmin = isSuperAdmin || roleLower === 'admin' || (currentUser?.groups || []).some(g => g.toLowerCase().includes('admin'));

  // Only the designated approver can approve/reject/disburse
  const isDesignatedApprover = useMemo(() => {
    if (!currentUser?.email || !designatedApproverEmail) return false;
    return currentUser.email.trim().toLowerCase() === designatedApproverEmail.trim().toLowerCase();
  }, [currentUser, designatedApproverEmail]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data, error }, { data: sysSettings }] = await Promise.all([
        supabase.from('csl_expense_approvals').select('*').order('created_at', { ascending: false }),
        supabase.from('csl_system_settings').select('setting_value').eq('setting_key', 'csl_expense_approver').maybeSingle()
      ]);

      if (error) {
        if (error.code === '42P01') {
          setExpenses([]);
        } else {
          toast.error('Failed to load expense requests: ' + error.message);
        }
        return;
      }
      if (data) setExpenses(data);
      if (sysSettings?.setting_value) {
        setDesignatedApproverEmail(sysSettings.setting_value);
        localStorage.setItem('csl_expense_approver', sysSettings.setting_value);
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
            requesterEmail: currentUser?.email,
            folderType: 'document'
          }
        });

        if (uploadError || !uploadData?.success) {
          throw new Error('Failed to upload invoice attachment to Google Drive.');
        }
        attachmentId = uploadData.fileId;
      }

      const payload = {
        ...form,
        total_amount: Number(String(form.total_amount).replace(/\D/g, '')),
        expense_number: generateNumber(),
        prepared_by_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
        prepared_by_id: currentUser?.id ? String(currentUser.id) : null,
        status: 'PENDING_APPROVAL',
        invoice_attachment_id: attachmentId,
        created_at: new Date().toISOString()
      };
      const { error } = await supabase.from('csl_expense_approvals').insert([payload]);
      if (error) {
        if (error.code === '42P01') {
          throw new Error('Table csl_expense_approvals is not available in the database.');
        }
        throw error;
      }
      toast.success('Expense request submitted successfully!');
      setIsFormOpen(false);
      setForm(EMPTY_FORM);
      setAttachmentFile(null);
      fetchData();

      // Notify designated single approver by email
      let approverEmail = 'natalia@gesit.co.id';
      try {
        const { data: sysSettings, error: sysErr } = await supabase.from('csl_system_settings').select('setting_value').eq('setting_key', 'csl_expense_approver').maybeSingle();
        if (!sysErr && sysSettings?.setting_value) {
          approverEmail = sysSettings.setting_value.trim();
        } else {
          const saved = localStorage.getItem('csl_expense_approver');
          if (saved && saved.trim()) approverEmail = saved.trim();
        }
      } catch {}
      if (approverEmail) {
        await sendEmailNotification(
          approverEmail,
          `[CSL] New Expense Approval Request: ${payload.expense_number}`,
          `Hello,\n\nA new Expense Request requires your review and approval.\n\nRequest No : ${payload.expense_number}\nProject    : ${payload.project_name}\nPaid to    : ${payload.paid_to}\nTotal      : ${formatRp(payload.total_amount)}\nPrepared by: ${payload.prepared_by_name}\n\nPlease log in to the CSL System to approve or reject this request.\n\nThank you.`
        );
      }
    } catch (err: any) {
      toast.error('Failed to submit: ' + err.message);
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
    toast.success('Expense request approved successfully.');
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  const handleReject = async () => {
    if (!selected) return;
    const { error } = await supabase.from('csl_expense_approvals').update({
      status: 'REJECTED',
    }).eq('id', selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense request rejected.');
    if (selected.prepared_by_name) {
      await sendEmailNotification(
        selected.prepared_by_name,
        `[CSL] Expense Request Rejected: ${selected.expense_number}`,
        `Expense request ${selected.expense_number} for project "${selected.project_name}" of ${formatRp(selected.total_amount)} has been REJECTED.\n\nPlease log in to CSL System to review details and submit revisions if needed.`
      );
    }
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  const handleDisburse = async () => {
    if (!selected) return;
    const { error } = await supabase.from('csl_expense_approvals').update({
      status: 'DISBURSED',
    }).eq('id', selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense request marked as disbursed.');
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  const handleDelete = async () => {
    if (!selected) return;
    const { error } = await supabase.from('csl_expense_approvals').delete().eq('id', selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Expense request deleted successfully.');
    setSelected(null);
    setConfirmAction(null);
    fetchData();
  };

  const totalExpenses    = expenses.length;
  const pendingCount     = expenses.filter(e => e.status === 'PENDING_APPROVAL').length;
  const approvedCount    = expenses.filter(e => e.status === 'APPROVED').length;
  const disbursedCount   = expenses.filter(e => e.status === 'DISBURSED').length;

  const totalAmountAll   = expenses.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
  const pendingAmount    = expenses.filter(e => e.status === 'PENDING_APPROVAL').reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
  const approvedAmount   = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + (Number(e.total_amount) || 0), 0);

  const statusFilterOptions = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING_APPROVAL', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'DISBURSED', label: 'Disbursed' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  // ────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">

      {/* ── Page Header ── */}
      <PageHeader
        title="Expenses Approval"
        description="Manage, verify, and track operational and project expense approval requests"
      >
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateExpenseApprovalPdf(expenses.filter(e => selectedIds.includes(e.id)) as any)}
              className="h-9 text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print {selectedIds.length} request{selectedIds.length > 1 ? 's' : ''}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={fetchData} className="h-9 text-xs gap-1.5">
            <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setIsFormOpen(true);
            }}
            className="h-9 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add expense
          </Button>
        </div>
      </PageHeader>

      {/* SLA Stat Cards — Informative with Nominal Amounts & Clear Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Requests',
            value: totalExpenses,
            amount: formatRp(totalAmountAll),
            icon: Receipt,
            sub: 'Total registered expense requests',
          },
          {
            label: 'Pending Approval',
            value: pendingCount,
            amount: formatRp(pendingAmount),
            icon: Clock,
            sub: 'Awaiting manager approval',
          },
          {
            label: 'Approved',
            value: approvedCount,
            amount: formatRp(approvedAmount),
            icon: CheckCircle2,
            sub: 'Approved & ready for disbursement',
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
                <span className="text-xs text-muted-foreground">Request{value !== 1 ? 's' : ''}</span>
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
              placeholder="Search project, vendor, invoice..."
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
            <h3 className="font-semibold text-sm text-foreground">Expense Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Manage expense submissions, approval workflow, and payment vouchers</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 border border-border/50 px-2.5 py-1 rounded-md">
              {filteredExpenses.length} Request{filteredExpenses.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading expense requests…</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-20 text-center">
            <Receipt className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No expense requests found.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/40">
                <TableHead className="w-10 pl-5">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? filteredExpenses.map(x => x.id) : [])}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Expense / Date</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Project &amp; Paid to</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Total Amount</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Beneficiary Bank</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Prepared By</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Status</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80 text-right pr-5">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map(exp => (
                <TableRow
                  key={exp.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setViewingDetail(exp)}
                >
                  <TableCell className="pl-5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={selectedIds.includes(exp.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, exp.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== exp.id));
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs font-semibold text-foreground">{exp.expense_number}</p>
                    <p className="text-xs text-foreground/75 mt-0.5">
                      {new Date(exp.request_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground max-w-[200px] truncate" title={exp.project_name}>{exp.project_name}</p>
                    <p className="text-xs text-foreground/75 max-w-[200px] truncate">{exp.paid_to}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-sm font-semibold text-foreground whitespace-nowrap">{formatRp(exp.total_amount)}</p>
                    {exp.invoice_number && (
                      <p className="text-xs text-foreground/75 font-mono mt-0.5">Inv: {exp.invoice_number}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium text-foreground">{exp.bank_name}</p>
                    <p className="text-xs text-foreground/75 font-mono">{exp.account_number}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium text-foreground">{exp.prepared_by_name}</p>
                    <p className="text-xs text-foreground/75">{exp.department}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] px-2 py-0.5 rounded-md border ${STATUS_STYLE[exp.status] || ''}`}>
                      {formatStatusText(exp.status)}
                    </Badge>
                    {exp.approved_by_name && (exp.status === 'APPROVED' || exp.status === 'DISBURSED') && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {exp.approved_by_name}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-5" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" />}>
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setViewingDetail(exp)} className="gap-2 text-xs">
                          <Eye className="h-3.5 w-3.5" /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateExpenseApprovalPdf([exp as any])} className="gap-2 text-xs">
                          <Printer className="h-3.5 w-3.5" /> Print PDF voucher
                        </DropdownMenuItem>

                        {isDesignatedApprover && exp.status === 'PENDING_APPROVAL' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setSelected(exp); setConfirmAction('approve'); }}
                              className="gap-2 text-xs text-emerald-600 focus:text-emerald-600"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve request
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setSelected(exp); setConfirmAction('reject'); }}
                              className="gap-2 text-xs text-rose-600 focus:text-rose-600"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject request
                            </DropdownMenuItem>
                          </>
                        )}

                        {isDesignatedApprover && exp.status === 'APPROVED' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setSelected(exp); setConfirmAction('disburse'); }}
                              className="gap-2 text-xs text-blue-600 focus:text-blue-600"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Mark as disbursed
                            </DropdownMenuItem>
                          </>
                        )}

                        {isSuperAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setSelected(exp); setConfirmAction('delete'); }}
                              className="gap-2 text-xs text-rose-600 focus:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete request
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          Create Expense Dialog
      ────────────────────────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/40">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
              <DialogTitle className="text-base font-semibold">Create expense request</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground ml-9">
              Fill in the expense details. Email notification will be dispatched to the designated approver.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[72vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Company *</FieldLabel>
                <Input
                  required
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <FieldLabel>Department *</FieldLabel>
                <Input
                  required
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Project Name *</FieldLabel>
              <textarea
                required
                rows={2}
                value={form.project_name}
                onChange={e => setForm({ ...form, project_name: e.target.value })}
                placeholder="e.g. Notary Fees & Business Licensing"
                className="w-full p-2.5 text-sm bg-background border border-input rounded-md resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Request Date *</FieldLabel>
                <Input
                  required
                  type="date"
                  value={form.request_date}
                  onChange={e => setForm({ ...form, request_date: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <FieldLabel>Paid To (Payee / Vendor) *</FieldLabel>
                <Input
                  required
                  value={form.paid_to}
                  onChange={e => setForm({ ...form, paid_to: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="e.g. Notary Monica Kusumadevi"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Total Amount (IDR) *</FieldLabel>
                <Input
                  required
                  type="number"
                  value={form.total_amount}
                  onChange={e => setForm({ ...form, total_amount: e.target.value })}
                  className="h-9 text-sm font-mono"
                  placeholder="4602564"
                />
              </div>
              <div>
                <FieldLabel>Vendor Invoice No.</FieldLabel>
                <Input
                  value={form.invoice_number}
                  onChange={e => setForm({ ...form, invoice_number: e.target.value.toUpperCase() })}
                  className="h-9 text-sm font-mono uppercase"
                  placeholder="020/INV/VIII/2026"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 size={13} className="text-muted-foreground" />
                Beneficiary Bank Information
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Bank *</FieldLabel>
                  <Input
                    required
                    value={form.bank_name}
                    onChange={e => setForm({ ...form, bank_name: e.target.value })}
                    className="h-8 text-xs bg-background"
                    placeholder="BCA"
                  />
                </div>
                <div>
                  <FieldLabel>Account Number *</FieldLabel>
                  <Input
                    required
                    value={form.account_number}
                    onChange={e => setForm({ ...form, account_number: e.target.value })}
                    className="h-8 text-xs bg-background font-mono"
                    placeholder="7310603141"
                  />
                </div>
                <div>
                  <FieldLabel>Account Name *</FieldLabel>
                  <Input
                    required
                    value={form.account_name}
                    onChange={e => setForm({ ...form, account_name: e.target.value })}
                    className="h-8 text-xs bg-background"
                    placeholder="Monica Kusuma Devi"
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>Additional Note</FieldLabel>
              <textarea
                rows={2}
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Additional notes or descriptions..."
                className="w-full p-2.5 text-sm bg-background border border-input rounded-md resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div>
              <FieldLabel>Invoice Attachment (Optional)</FieldLabel>
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
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="h-9 text-xs gap-1.5">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────
          Expense Detail Dialog
      ────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!viewingDetail} onOpenChange={(open) => !open && setViewingDetail(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-border/40">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <DialogTitle className="text-base font-semibold font-mono">{viewingDetail?.expense_number}</DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground ml-9">
                  Submitted by <span className="font-medium text-foreground">{viewingDetail?.prepared_by_name}</span> • {viewingDetail?.department} ({viewingDetail?.company})
                </DialogDescription>
              </div>
              {viewingDetail?.status && (
                <Badge variant="outline" className={`text-[11px] px-2.5 py-1 rounded-md border ${STATUS_STYLE[viewingDetail.status] || ''}`}>
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
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Amount</p>
                  <p className="text-2xl font-semibold font-mono">
                    {viewingDetail ? formatRp(viewingDetail.total_amount) : '-'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Invoice: {viewingDetail?.invoice_number || '—'}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/40 shadow-none">
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Request Date</p>
                  <p className="text-sm font-semibold">
                    {viewingDetail?.request_date ? new Date(viewingDetail.request_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    Approver: {viewingDetail?.approved_by_name || 'Pending Review'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Project & Vendor Details */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Project &amp; Payee Details
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Project Name</p>
                  <p className="font-medium">{viewingDetail?.project_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Paid To (Payee)</p>
                  <p className="font-medium">{viewingDetail?.paid_to}</p>
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Beneficiary Bank Account
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Bank</span>
                  <p className="font-medium text-foreground">{viewingDetail?.bank_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Account Number</span>
                  <p className="font-mono font-semibold text-foreground">{viewingDetail?.account_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Account Name</span>
                  <p className="font-medium text-foreground">{viewingDetail?.account_name}</p>
                </div>
              </div>
            </div>

            {/* Attachment */}
            {viewingDetail?.invoice_attachment_id && (
              <div className="p-4 rounded-xl border border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Vendor Invoice Attachment</p>
                    <p className="text-[11px] text-muted-foreground">Stored in Google Drive</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => window.open(`https://drive.google.com/open?id=${viewingDetail.invoice_attachment_id}`, '_blank')}
                >
                  Open file <ExternalLink size={12} />
                </Button>
              </div>
            )}

            {/* Note */}
            {viewingDetail?.note && (
              <div className="p-4 rounded-xl border border-border/60 bg-muted/10">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Additional Note</p>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{viewingDetail.note}</p>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/40 gap-2 flex sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setViewingDetail(null)} className="h-9 text-xs">
              Close
            </Button>
            <Button size="sm" onClick={() => generateExpenseApprovalPdf([viewingDetail as any])} className="h-9 text-xs gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print PDF voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Approve / Reject / Disburse / Delete ── */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' ? 'Approve Expense Request?' : 
               confirmAction === 'reject' ? 'Reject Expense Request?' : 
               confirmAction === 'disburse' ? 'Mark as Disbursed?' :
               'Delete Expense Request?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {confirmAction === 'approve'
                ? `You are about to approve request ${selected?.expense_number} amounting to ${formatRp(selected?.total_amount || 0)}.`
                : confirmAction === 'reject'
                ? `You are about to reject request ${selected?.expense_number}. This action cannot be undone.`
                : confirmAction === 'disburse'
                ? `Mark request ${selected?.expense_number} as disbursed to beneficiary account.`
                : `You are about to delete request ${selected?.expense_number}. Deleted data cannot be recovered.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={
                confirmAction === 'approve' ? handleApprove :
                confirmAction === 'reject' ? handleReject :
                confirmAction === 'disburse' ? handleDisburse :
                handleDelete
              }
              className={
                confirmAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                confirmAction === 'disburse' ? 'bg-blue-600 hover:bg-blue-500 text-white' :
                'bg-red-600 hover:bg-red-500 text-white'
              }
            >
              {confirmAction === 'approve' ? 'Yes, Approve' :
               confirmAction === 'reject' ? 'Yes, Reject' :
               confirmAction === 'disburse' ? 'Yes, Mark Disbursed' :
               'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
