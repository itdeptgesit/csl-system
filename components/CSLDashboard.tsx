import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { 
  Kanban, 
  Calendar, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  TrendingUp, 
  FileText, 
  ShieldCheck, 
  ArrowUpRight,
  Receipt,
  ArrowRight,
  DollarSign,
  Building2,
  FileCheck2,
  PieChart as PieChartIcon
} from 'lucide-react';
import { fetchBudgetExpensesReport, formatIdr, BudgetExpensesReportData } from '@/services/cslBudgetReportService';

interface CSLDashboardProps {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT:        'border-zinc-500/25 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 font-medium',
  SUBMITTED:    'border-blue-500/25 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-medium',
  PROCESSING:   'border-amber-500/25 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium',
  REVIEW_USER:  'border-purple-500/25 text-purple-700 dark:text-purple-300 bg-purple-500/10 font-medium',
  COMPLETED:    'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium',
  CLOSED:       'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium',
  REJECTED:     'border-rose-500/25 text-rose-700 dark:text-rose-300 bg-rose-500/10 font-medium',
};

const formatStatus = (s: string) => {
  if (!s) return '';
  if (s === 'REVIEW_USER') return 'Review';
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export const CSLDashboard: React.FC<CSLDashboardProps> = ({ currentUser, onNavigate }) => {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'User';

  const [stats, setStats] = useState({
    activeRequests: 0,
    pendingTasks: 0,
    pendingExpenses: 0,
    pendingOffshore: 0,
    completedRequests: 0,
    totalRequests: 0,
    slaCompliantRequests: 0,
  });

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    DRAFT: 0, SUBMITTED: 0, PROCESSING: 0, REVIEW_USER: 0, COMPLETED: 0
  });

  const [myActionItems, setMyActionItems] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [budgetReport, setBudgetReport] = useState<BudgetExpensesReportData | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          { data: requests },
          { data: rupsData },
          { data: asetData },
          { data: agreementData },
          { data: expenses },
          { data: offshoreInvoices },
          budgetData
        ] = await Promise.all([
          supabase.from('csl_requests').select('*').order('created_at', { ascending: false }),
          supabase.from('csl_rups_ar').select('*').order('id', { ascending: false }),
          supabase.from('csl_task_aset').select('*').order('id', { ascending: false }),
          supabase.from('csl_task_agreement').select('*').order('id', { ascending: false }),
          supabase.from('csl_expense_approvals').select('*'),
          supabase.from('csl_offshore_invoices').select('*'),
          fetchBudgetExpensesReport({
            periodType: 'year',
            fiscalYear: new Date().getFullYear(),
            payeeType: 'all',
            company: 'all',
            department: 'all',
            project: 'all',
            status: 'all',
            category: 'all',
            currency: 'all',
            paymentLocation: 'all',
            paymentMethod: 'all',
            search: ''
          }).catch(() => null)
        ]);

        if (budgetData) {
          setBudgetReport(budgetData);
        }

        // Aggregate actual tasks from the 3 tables (RUPS, Aset, Agreement)
        const combinedTasks: any[] = [];
        if (rupsData && Array.isArray(rupsData)) {
          rupsData.forEach(r => {
            combinedTasks.push({
              id: `rups_${r.id}`,
              category: 'RUPS & AR',
              task_name: `${r.company || 'PT'} - RUPS ${r.periode || ''}`,
              owner: r.owner || 'CSL Team',
              status: r.status || 'Belum',
              due_date: r.due_date,
              finish_date: r.finish_date
            });
          });
        }
        if (asetData && Array.isArray(asetData)) {
          asetData.forEach(a => {
            combinedTasks.push({
              id: `aset_${a.id}`,
              category: 'Aset CSL',
              task_name: `${a.company ? a.company + ': ' : ''}${a.task_name || 'Aset Dokumen'}`,
              owner: a.owner || 'CSL Team',
              status: a.status || 'Draft',
              due_date: a.due_date,
              finish_date: null
            });
          });
        }
        if (agreementData && Array.isArray(agreementData)) {
          agreementData.forEach(g => {
            combinedTasks.push({
              id: `agr_${g.id}`,
              category: 'Perjanjian',
              task_name: `${g.company ? g.company + ': ' : ''}${g.title || g.description || 'Review Kontrak'}`,
              owner: g.owner || g.pic || 'Legal',
              status: g.status || 'Pending',
              due_date: g.due_date || g.end_date,
              finish_date: null
            });
          });
        }

        const pendingCombined = combinedTasks.filter(t => 
          !['selesai', 'completed', 'done', 'closed'].includes(String(t.status).toLowerCase())
        );
        setStats(prev => ({ ...prev, pendingTasks: pendingCombined.length }));
        setUpcomingTasks(pendingCombined.slice(0, 4));

        if (requests) {
          const active = requests.filter(r => !['COMPLETED', 'CLOSED', 'REJECTED'].includes(r.status));
          const completed = requests.filter(r => r.status === 'COMPLETED' || r.status === 'CLOSED');

          // SLA Compliance calculation
          let compliantCount = 0;
          completed.forEach(r => {
            if (r.sla_due_date) {
              if (new Date(r.updated_at || r.created_at) <= new Date(r.sla_due_date)) compliantCount++;
            } else {
              compliantCount++;
            }
          });

          // Status breakdown
          const counts: Record<string, number> = { DRAFT: 0, SUBMITTED: 0, PROCESSING: 0, REVIEW_USER: 0, COMPLETED: 0 };
          requests.forEach(r => {
            if (counts[r.status] !== undefined) counts[r.status]++;
            else if (r.status === 'CLOSED') counts.COMPLETED++;
          });
          setStatusCounts(counts);

          // Action items for current user
          const myId = currentUser?.id ? String(currentUser.id) : '';
          const myName = currentUser?.fullName || '';
          const actionItems = requests.filter(r =>
            !['COMPLETED', 'CLOSED', 'REJECTED'].includes(r.status) &&
            (r.assigned_pic_id === myId || r.assigned_pic_name === myName || (r.status === 'REVIEW_USER' && r.requester_email === currentUser?.email))
          );
          setMyActionItems(actionItems.slice(0, 5));

          setStats(prev => ({
            ...prev,
            activeRequests: active.length,
            completedRequests: completed.length,
            totalRequests: requests.length,
            slaCompliantRequests: compliantCount,
          }));

          setRecentRequests(requests.slice(0, 6));
        }

        if (expenses) {
          const pendingEx = expenses.filter(e => e.status === 'PENDING_APPROVAL');
          setStats(prev => ({ ...prev, pendingExpenses: pendingEx.length }));
        }

        if (offshoreInvoices) {
          const pendingOff = offshoreInvoices.filter(i => i.status === 'PENDING_APPROVAL');
          setStats(prev => ({ ...prev, pendingOffshore: pendingOff.length }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const slaPercentage = stats.completedRequests > 0
    ? Math.round((stats.slaCompliantRequests / stats.completedRequests) * 100)
    : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      
      {/* ── Hero Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 md:p-8 shadow-sm">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-32 -bottom-10 h-44 w-44 rounded-full bg-amber-500/5 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-[11px] font-semibold text-foreground tracking-wide uppercase">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Corporate Secretary & Legal Platform</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName}!
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Overview of legal requests, compliance routines, document repositories, offshore payments, and expense approvals.
            </p>
          </div>

          <div className="relative shrink-0 flex items-center justify-center md:justify-end">
            <img 
              src="/image/teamwork.png" 
              alt="Teamwork Illustration" 
              className="h-28 md:h-32 lg:h-36 w-auto object-contain drop-shadow-sm select-none pointer-events-none" 
            />
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards (Corporate Law & Compliance Precision) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Requests */}
        <div 
          onClick={() => onNavigate('csl-all-requests')}
          className="bg-card border border-border/80 hover:border-blue-500/50 p-4 rounded-xl shadow-sm flex flex-col justify-between transition-all hover:shadow cursor-pointer relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Permintaan Legal</span>
            <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Kanban className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground tracking-tight">{stats.activeRequests}</p>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">Aktif</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>{stats.totalRequests} total berkas</span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium text-[10px]">Rincian &rarr;</span>
            </p>
          </div>
        </div>

        {/* Pending Tasks */}
        <div 
          onClick={() => onNavigate('routine-task')}
          className="bg-card border border-border/80 hover:border-amber-500/50 p-4 rounded-xl shadow-sm flex flex-col justify-between transition-all hover:shadow cursor-pointer relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Kepatuhan &amp; RUPS</span>
            <div className="h-7 w-7 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground tracking-tight">{stats.pendingTasks}</p>
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">Pending</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>RUPS, Aset &amp; Kontrak</span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium text-[10px]">Rincian &rarr;</span>
            </p>
          </div>
        </div>

        {/* Pending Approvals (Expenses & Offshore) */}
        <div 
          onClick={() => onNavigate('budget')}
          className="bg-card border border-border/80 hover:border-emerald-500/50 p-4 rounded-xl shadow-sm flex flex-col justify-between transition-all hover:shadow cursor-pointer relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Persetujuan Biaya</span>
            <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground tracking-tight">
                {stats.pendingExpenses + stats.pendingOffshore}
              </p>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">Menunggu</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>{stats.pendingExpenses} Lokal • {stats.pendingOffshore} Offshore</span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium text-[10px]">Rincian &rarr;</span>
            </p>
          </div>
        </div>

        {/* SLA Compliance */}
        <div 
          onClick={() => onNavigate('reports-request')}
          className="bg-card border border-border/80 hover:border-purple-500/50 p-4 rounded-xl shadow-sm flex flex-col justify-between transition-all hover:shadow cursor-pointer relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ketepatan SLA</span>
            <div className="h-7 w-7 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground tracking-tight">{slaPercentage}%</p>
              <span className="text-[10px] font-semibold text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">Tepat Waktu</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>{stats.slaCompliantRequests} dari {stats.completedRequests} selesai</span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium text-[10px]">Rincian &rarr;</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Budget & Financial Intelligence (Antislop Real Enterprise Ledger) ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <h2 className="text-sm font-bold text-foreground tracking-tight">Anggaran &amp; Realisasi Biaya CSL ({new Date().getFullYear()})</h2>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                Persetujuan &amp; Offshore
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Monitoring alokasi pagu tahunan vs realisasi pengeluaran legal operasional</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigate('budget')} 
            className="h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto border-border/70 hover:bg-muted"
          >
            Buka Modul Budget <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* 3 Metric High-Density Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border/70 bg-card/60">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Total Alokasi Budget</span>
              <p className="text-xl font-bold font-mono text-foreground mt-1 tracking-tight">
                {budgetReport ? formatIdr(budgetReport.summary.totalBudget) : 'Rp 0'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {budgetReport?.summary.isBudgetDefined ? 'Pagu resmi tahun berjalan' : 'Pagu anggaran terdaftar'}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border/70 bg-card/60">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Total Realisasi (Paid/Approved)</span>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">
                {budgetReport ? formatIdr(budgetReport.summary.actualExpenses) : 'Rp 0'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>Serapan: <strong className="font-mono text-foreground font-semibold">{budgetReport?.summary.budgetUtilization || 0}%</strong></span>
                <span className="text-[10px] font-mono">
                  {budgetReport && budgetReport.summary.actualExpenses <= budgetReport.summary.totalBudget ? 'Dalam Batas' : 'Over Pagu'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border/70 bg-card/60">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Sisa Alokasi Pagu</span>
              <p className={`text-xl font-bold font-mono mt-1 tracking-tight ${
                (budgetReport?.summary.budgetRemaining ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
              }`}>
                {budgetReport ? formatIdr(budgetReport.summary.budgetRemaining) : 'Rp 0'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {budgetReport && budgetReport.summary.pendingApprovalCount > 0 
                  ? `${budgetReport.summary.pendingApprovalCount} transaksi pending (${formatIdr(budgetReport.summary.pendingApprovalAmount)})`
                  : 'Tidak ada pengeluaran tertahan'}
              </p>
            </div>
          </div>

          {/* Progress Bar Serapan */}
          {budgetReport && budgetReport.summary.totalBudget > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Tingkat Penyerapan Anggaran</span>
                <span className="font-mono font-bold text-foreground">{budgetReport.summary.budgetUtilization}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    budgetReport.summary.budgetUtilization > 100 
                      ? 'bg-rose-500' 
                      : budgetReport.summary.budgetUtilization > 80 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(budgetReport.summary.budgetUtilization, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Real Transaction Feed vs Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
            {/* Top Categories */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-muted-foreground" />
                Realisasi Per Kategori Biaya
              </span>
              <div className="space-y-2">
                {budgetReport && budgetReport.expenseByCategory.length > 0 ? (
                  budgetReport.expenseByCategory.slice(0, 4).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary/70" />
                        <span className="font-medium text-foreground">{cat.category}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">({cat.transactionCount} txn)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-foreground">{formatIdr(cat.amount)}</span>
                        <span className="text-[10px] text-muted-foreground ml-2 font-mono">({cat.percentage}%)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-3">Belum ada pengeluaran tercatat periode ini.</p>
                )}
              </div>
            </div>

            {/* Recent Expenses List */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                Transaksi Pengeluaran Terkini
              </span>
              <div className="space-y-2">
                {budgetReport && budgetReport.transactions.length > 0 ? (
                  budgetReport.transactions.slice(0, 4).map((txn, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-foreground truncate">{txn.payment_description || txn.project_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {txn.company} • <span className="font-mono">{txn.expense_number}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono font-bold text-foreground">{formatIdr(txn.reporting_amount)}</span>
                        <span className={`block text-[9px] font-bold uppercase ${
                          ['PAID', 'DISBURSED', 'APPROVED'].includes(txn.status) ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-3">Belum ada transaksi.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Access Modules Grid ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Access Modules
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { id: 'csl-requests', label: 'Ticketing & Requests', icon: Kanban, route: 'csl-all-requests', desc: 'Legal intake & SLA' },
            { id: 'routine', label: 'Tasks & Compliance', icon: Calendar, route: 'routine-task', desc: 'Routines & tracking' },
            { id: 'budget-exp', label: 'Budget & Expenses', icon: Receipt, route: 'budget', desc: 'Company & personal expenses' },
            { id: 'directory', label: 'Directory & Reports', icon: TrendingUp, route: 'reports-request', desc: 'Analytics & contacts' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                className="flex flex-col items-start p-4 rounded-xl border border-border/60 bg-card hover:border-border hover:bg-muted/40 transition-all text-left group"
              >
                <div className="h-9 w-9 rounded-lg bg-muted/70 flex items-center justify-center text-foreground group-hover:text-primary transition-colors mb-3">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Dashboard Sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 cols): Status Mini Breakdown & Recent Requests */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Breakdown Mini Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Pipeline Permintaan Legal</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ringkasan status seluruh tiket bantuan hukum berjalan</p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {stats.totalRequests} Total Tiket
              </Badge>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { status: 'DRAFT', label: 'Draft', count: statusCounts.DRAFT, style: 'bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300' },
                { status: 'SUBMITTED', label: 'Submitted', count: statusCounts.SUBMITTED, style: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300' },
                { status: 'PROCESSING', label: 'Diproses', count: statusCounts.PROCESSING, style: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300' },
                { status: 'REVIEW_USER', label: 'Review User', count: statusCounts.REVIEW_USER, style: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300' },
                { status: 'COMPLETED', label: 'Selesai', count: statusCounts.COMPLETED, style: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300' },
              ].map((s) => (
                <div 
                  key={s.status} 
                  onClick={() => onNavigate('csl-all-requests')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-lg border ${s.style} cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all`}
                >
                  <span className="text-2xl font-black font-mono tracking-tight">{s.count}</span>
                  <span className="text-[11px] font-semibold mt-1 tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Legal Requests Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Recent Legal Requests</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Latest submitted requests requiring attention</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('csl-all-requests')} 
                className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="divide-y divide-border/40">
              {recentRequests.length > 0 ? (
                recentRequests.map((req, idx) => {
                  const isOverdue = req.sla_due_date && new Date(req.sla_due_date) < new Date() && !['COMPLETED', 'CLOSED', 'REJECTED'].includes(req.status);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigate('csl-all-requests')}
                      className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-foreground">{req.request_number}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                            {req.department || req.company || 'General'}
                          </span>
                          {isOverdue && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-rose-500/30 text-rose-600 bg-rose-500/10 gap-1 font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate max-w-md">
                          {req.description || 'No description provided'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          PIC: <span className="font-medium text-foreground/80">{req.assigned_pic_name || 'Unassigned'}</span> • {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Badge variant="outline" className={`text-[11px] px-2.5 py-0.5 rounded-md border ${STATUS_STYLE[req.status] || ''}`}>
                          {formatStatus(req.status)}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No requests recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Action Items & Active Tasks */}
        <div className="space-y-6">
          
          {/* Action Items Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">My Action Items</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tasks &amp; reviews assigned to you</p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {myActionItems.length}
              </Badge>
            </div>

            <div className="p-4 space-y-2.5">
              {myActionItems.length > 0 ? (
                myActionItems.map((req, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => onNavigate('csl-all-requests')} 
                    className="p-3 rounded-lg bg-muted/40 hover:bg-muted/80 transition-colors border border-border/60 cursor-pointer space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-semibold text-foreground">{req.request_number}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-600 bg-blue-500/10">
                        {req.status === 'REVIEW_USER' ? 'Review Needed' : 'Assigned to You'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{req.description || 'No description'}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-1">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500/60 mb-2" />
                  <p className="text-xs font-semibold text-foreground">You're all caught up!</p>
                  <p className="text-[11px]">No pending actions assigned to you.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Tasks & Compliance Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Upcoming Tasks</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Compliance &amp; agreement schedules</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('routine-task')} 
                className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="p-4 space-y-2.5">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task, idx) => {
                  const isTaskOverdue = task.due_date && new Date(task.due_date) < new Date();
                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigate('routine-task')}
                      className={`p-3 rounded-lg border space-y-1.5 cursor-pointer transition-colors ${
                        isTaskOverdue 
                          ? 'bg-rose-500/5 border-rose-500/25 hover:bg-rose-500/10' 
                          : 'bg-muted/30 border-border/60 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold uppercase text-primary tracking-wide">
                              {task.category || 'Routine'}
                            </span>
                            {isTaskOverdue && (
                              <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-foreground truncate mt-0.5">
                            {task.task_name || task.company || 'Unnamed Task'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {task.status || 'Pending'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                        <span>PIC: <strong className="font-medium text-foreground/80">{task.owner || '-'}</strong></span>
                        <span className={isTaskOverdue ? 'text-rose-600 font-semibold' : ''}>
                          {task.due_date || task.finish_date 
                            ? new Date(task.due_date || task.finish_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) 
                            : 'No date'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No upcoming tasks.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
