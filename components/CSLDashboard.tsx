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
import { fetchBudgetExpensesReport, BudgetExpensesReportData } from '@/services/cslBudgetReportService';
import { getUnifiedStatusBadge, formatCslDate, formatCslCurrency, formatCslNumber } from '@/utils/cslStatusHelper';

interface CSLDashboardProps {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

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
              task_name: `${g.request_by ? '[' + g.request_by + '] ' : ''}${g.task_name || g.title || 'Review Kontrak'}`,
              owner: g.owner || 'Legal',
              status: g.status || 'Pending',
              due_date: g.finish_date || g.due_date || null,
              finish_date: g.finish_date || null
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
      <div className="relative overflow-hidden rounded-2xl border border-[#e6e9f0] bg-card p-6 md:p-8 shadow-xs">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#0a2540]/5 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-10 h-44 w-44 rounded-full bg-[#c9a227]/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e9f0] bg-[#f6f7f9] px-3 py-1 text-[11px] font-bold text-[#c9a227] tracking-wider uppercase">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0a2540]" />
              <span>Corporate Secretary & Legal Platform</span>
            </div>
            <h1 className="text-[30px] font-bold tracking-tight text-[#0a2540] dark:text-zinc-100 font-sans leading-tight">
              Selamat datang kembali, {firstName}!
            </h1>
            <p className="text-xs md:text-sm text-[#758196] leading-relaxed">
              Pusat kendali dan monitoring permintaan hukum, rutinitas kepatuhan, repositori dokumen, persetujuan biaya, dan pelaporan CSL.
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

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Active Requests */}
        <div 
          onClick={() => onNavigate('csl-requests')}
          className="bg-card border border-[#e6e9f0] hover:border-[#0a2540]/30 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#758196] uppercase tracking-wider">Permintaan Legal</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Kanban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-[28px] font-bold font-mono text-[#0a2540] tracking-tight">{stats.activeRequests}</p>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Aktif</span>
            </div>
            <p className="text-[11px] text-[#758196] mt-1 flex items-center justify-between">
              <span>{stats.totalRequests} total berkas</span>
              <span className="text-[#0a2540] group-hover:underline font-semibold text-[11px]">Rincian &rarr;</span>
            </p>
          </div>
        </div>

        {/* Pending Tasks */}
        <div 
          onClick={() => onNavigate('routine-rups')}
          className="bg-card border border-[#e6e9f0] hover:border-[#0a2540]/30 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#758196] uppercase tracking-wider">Kepatuhan &amp; RUPS</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-[28px] font-bold font-mono text-[#0a2540] tracking-tight">{stats.pendingTasks}</p>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Pending</span>
            </div>
            <p className="text-[11px] text-[#758196] mt-1 flex items-center justify-between">
              <span>RUPS, Aset &amp; Kontrak</span>
              <span className="text-[#0a2540] group-hover:underline font-semibold text-[11px]">Rincian &rarr;</span>
            </p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div 
          onClick={() => onNavigate('budget')}
          className="bg-card border border-[#e6e9f0] hover:border-[#0a2540]/30 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#758196] uppercase tracking-wider">Persetujuan Biaya</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-[28px] font-bold font-mono text-[#0a2540] tracking-tight">
                {stats.pendingExpenses + stats.pendingOffshore}
              </p>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Menunggu</span>
            </div>
            <p className="text-[11px] text-[#758196] mt-1 flex items-center justify-between">
              <span>{stats.pendingExpenses} Lokal • {stats.pendingOffshore} Offshore</span>
              <span className="text-[#0a2540] group-hover:underline font-semibold text-[11px]">Rincian &rarr;</span>
            </p>
          </div>
        </div>

        {/* SLA Compliance */}
        <div 
          onClick={() => onNavigate('reports-request')}
          className="bg-card border border-[#e6e9f0] hover:border-[#0a2540]/30 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#758196] uppercase tracking-wider">Ketepatan SLA</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-[28px] font-bold font-mono text-[#0a2540] tracking-tight">{slaPercentage}%</p>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">Tepat Waktu</span>
            </div>
            <p className="text-[11px] text-[#758196] mt-1 flex items-center justify-between">
              <span>{stats.slaCompliantRequests} dari {stats.completedRequests} selesai</span>
              <span className="text-[#0a2540] group-hover:underline font-semibold text-[11px]">Rincian &rarr;</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Anggaran & Pengeluaran Legal CSL ── */}
      <div className="rounded-2xl border border-[#e6e9f0] bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e6e9f0] bg-[#fafbfc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <h2 className="text-sm font-bold text-[#0a2540] tracking-tight">Anggaran &amp; Pengeluaran Legal CSL ({new Date().getFullYear()})</h2>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#f6f7f9] text-[#758196] border border-[#e6e9f0]">
                Persetujuan &amp; Offshore
              </span>
            </div>
            <p className="text-xs text-[#758196]">Monitoring pagu anggaran resmi vs realisasi pengeluaran tahun berjalan</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigate('budget')} 
            className="h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto border-[#e6e9f0] hover:bg-[#f6f7f9]"
          >
            Buka Modul Budget <ArrowUpRight className="h-3.5 w-3.5 text-[#758196]" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* 3 Metric Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl border border-[#e6e9f0] bg-[#fafbfc]">
              <span className="text-[11px] font-bold text-[#758196] uppercase tracking-wider block">Total Anggaran (Setahun)</span>
              <p className="text-xl font-bold font-mono text-[#0a2540] mt-1 tracking-tight">
                {budgetReport ? formatCslCurrency(budgetReport.summary.totalBudget) : 'Rp 0'}
              </p>
              <p className="text-[11px] text-[#758196] mt-1">
                Jatah pagu dana resmi tahun berjalan
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#e6e9f0] bg-[#fafbfc]">
              <span className="text-[11px] font-bold text-[#758196] uppercase tracking-wider block">Sudah Terpakai (Realisasi)</span>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-1 tracking-tight">
                {budgetReport ? formatCslCurrency(budgetReport.summary.actualExpenses) : 'Rp 0'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-[#758196] mt-1">
                <span>Terpakai: <strong className="font-mono text-[#0a2540] font-semibold">{formatCslNumber(Number(budgetReport?.summary.budgetUtilization) || 0, 1)}%</strong></span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  {budgetReport && budgetReport.summary.actualExpenses <= budgetReport.summary.totalBudget ? 'Aman' : 'Over Budget'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#e6e9f0] bg-[#fafbfc]">
              <span className="text-[11px] font-bold text-[#758196] uppercase tracking-wider block">Sisa Dana Anggaran</span>
              <p className={`text-xl font-bold font-mono mt-1 tracking-tight ${
                (budgetReport?.summary.budgetRemaining ?? 0) < 0 ? 'text-rose-600' : 'text-[#0a2540]'
              }`}>
                {budgetReport ? formatCslCurrency(budgetReport.summary.budgetRemaining) : 'Rp 0'}
              </p>
              <p className="text-[11px] text-[#758196] mt-1">
                {budgetReport && budgetReport.summary.pendingApprovalCount > 0 
                  ? `${budgetReport.summary.pendingApprovalCount} transaksi pending (${formatCslCurrency(budgetReport.summary.pendingApprovalAmount)})`
                  : 'Sisa dana yang masih tersedia'}
              </p>
            </div>
          </div>

          {/* Progress Bar Serapan */}
          {budgetReport && budgetReport.summary.totalBudget > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#758196] font-medium">Tingkat Penyerapan Anggaran</span>
                <span className="font-mono font-bold text-[#0a2540]">
                  {formatCslNumber(Number(budgetReport.summary.budgetUtilization) || 0, 1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#eef0f4] overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    budgetReport.summary.budgetUtilization > 100 
                      ? 'bg-rose-500' 
                      : budgetReport.summary.budgetUtilization > 80 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(Number(budgetReport.summary.budgetUtilization) || 0, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Real Transaction Feed vs Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#e6e9f0]">
            {/* Top Categories */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-[#0a2540] uppercase tracking-wider flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-[#758196]" />
                Realisasi Per Kategori Biaya
              </span>
              <div className="space-y-2">
                {budgetReport && budgetReport.expenseByCategory.length > 0 ? (
                  budgetReport.expenseByCategory.slice(0, 4).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#e6e9f0]/60 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#0a2540]" />
                        <span className="font-medium text-[#16233a]">{cat.category}</span>
                        <span className="text-[10px] text-[#758196] font-mono">({cat.transactionCount} txn)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#0a2540]">{formatCslCurrency(cat.amount)}</span>
                        <span className="text-[10px] text-[#758196] ml-2 font-mono">({formatCslNumber(Number(cat.percentage) || 0, 1)}%)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#758196] py-3">Belum ada pengeluaran tercatat periode ini.</p>
                )}
              </div>
            </div>

            {/* Recent Expenses List */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-[#0a2540] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#758196]" />
                Transaksi Pengeluaran Terkini
              </span>
              <div className="space-y-2">
                {budgetReport && budgetReport.transactions.length > 0 ? (
                  budgetReport.transactions.slice(0, 4).map((txn, idx) => {
                    const badge = getUnifiedStatusBadge(txn.status);
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#e6e9f0]/60 last:border-0">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-[#16233a] truncate">{txn.payment_description || txn.project_name}</p>
                          <p className="text-[10px] text-[#758196] truncate">
                            {txn.company} • <span className="font-mono">{txn.expense_number}</span>
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="font-mono font-bold text-[#0a2540]">
                            {txn.currency && txn.currency !== 'IDR'
                              ? formatCslCurrency(txn.amount, txn.currency, txn.reporting_amount)
                              : formatCslCurrency(txn.reporting_amount)}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${badge.className} mt-0.5`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#758196] py-3">Belum ada transaksi.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Access Modules Grid ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#c9a227] uppercase tracking-wider">
          Akses Cepat Modul
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {[
            { id: 'csl-requests', label: 'Permintaan & Tiket', icon: Kanban, route: 'csl-requests', desc: 'Permintaan legal & pemenuhan SLA' },
            { id: 'routine-rups', label: 'RUPS - AR', icon: Calendar, route: 'routine-rups', desc: 'Jadwal rutin, RUPS & kepatuhan' },
            { id: 'routine-lkpm', label: 'Tracking LKPM', icon: FileCheck2, route: 'routine-lkpm', desc: 'Pantauan LKPM 81 perusahaan' },
            { id: 'budget', label: 'Anggaran & Biaya', icon: Wallet, route: 'budget', desc: 'Pengeluaran CSL lokal & valas' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                className="flex flex-col items-start p-4 rounded-2xl border border-[#e6e9f0] bg-card hover:border-[#0a2540]/30 hover:bg-[#fafbfc] transition-colors text-left group shadow-xs"
              >
                <div className="h-9 w-9 rounded-xl bg-[#f6f7f9] flex items-center justify-center text-[#0a2540] group-hover:bg-[#0a2540] group-hover:text-white transition-colors mb-3">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-[#0a2540] group-hover:text-[#0a2540] transition-colors">
                  {item.label}
                </p>
                <p className="text-[11px] text-[#758196] mt-0.5 line-clamp-1">
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
          <div className="rounded-2xl border border-[#e6e9f0] bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e6e9f0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#0a2540]">Pipeline Permintaan Legal</h3>
                <p className="text-xs text-[#758196] mt-0.5">Ringkasan status seluruh tiket bantuan hukum berjalan</p>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold text-[#0a2540] border-[#e6e9f0]">
                {stats.totalRequests} Total Berkas
              </Badge>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { status: 'DRAFT', label: 'Draf', count: statusCounts.DRAFT, badge: getUnifiedStatusBadge('DRAFT') },
                { status: 'SUBMITTED', label: 'Diajukan', count: statusCounts.SUBMITTED, badge: getUnifiedStatusBadge('SUBMITTED') },
                { status: 'PROCESSING', label: 'Diproses', count: statusCounts.PROCESSING, badge: getUnifiedStatusBadge('PROCESSING') },
                { status: 'REVIEW_USER', label: 'Review Pemohon', count: statusCounts.REVIEW_USER, badge: getUnifiedStatusBadge('REVIEW_USER') },
                { status: 'COMPLETED', label: 'Selesai', count: statusCounts.COMPLETED, badge: getUnifiedStatusBadge('COMPLETED') },
              ].map((s) => (
                <div 
                  key={s.status} 
                  onClick={() => onNavigate('csl-requests')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border ${s.badge.className} cursor-pointer hover:opacity-90 transition-opacity`}
                >
                  <span className="text-2xl font-bold font-mono tracking-tight">{s.count}</span>
                  <span className="text-[11px] font-semibold mt-1 tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Permintaan Legal Terkini Card */}
          <div className="rounded-2xl border border-[#e6e9f0] bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e6e9f0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#0a2540]">Permintaan Legal Terkini</h3>
                <p className="text-xs text-[#758196] mt-0.5">Permintaan terbaru yang diajukan dan membutuhkan tindak lanjut</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('csl-requests')} 
                className="h-8 text-xs font-semibold gap-1 text-[#0a2540] hover:bg-[#f6f7f9]"
              >
                Lihat Semua <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="divide-y divide-[#e6e9f0]">
              {recentRequests.length > 0 ? (
                recentRequests.map((req, idx) => {
                  const isOverdue = req.sla_due_date && new Date(req.sla_due_date) < new Date() && !['COMPLETED', 'CLOSED', 'REJECTED'].includes(req.status);
                  const badge = getUnifiedStatusBadge(req.status);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigate('csl-requests')}
                      className="p-4 hover:bg-[#fafbfc] dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#0a2540]">{req.request_number}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#f6f7f9] text-[#758196] border border-[#e6e9f0]">
                            {req.department || req.company || 'Umum'}
                          </span>
                          {isOverdue && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-rose-300 text-rose-700 bg-rose-50 gap-1 font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" /> Lewat Tenggat
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-[#16233a] truncate max-w-md">
                          {req.description || 'Tidak ada keterangan'}
                        </p>
                        <p className="text-[11px] text-[#758196]">
                          PIC: <span className="font-semibold text-[#0a2540]">{req.assigned_pic_name || 'Belum Ditugaskan'}</span> • Diajukan: {formatCslDate(req.created_at)}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-[#758196]">
                  Tidak ada permintaan tercatat saat ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Action Items & Active Tasks */}
        <div className="space-y-6">
          
          {/* Tindakan Saya Card */}
          <div className="rounded-2xl border border-[#e6e9f0] bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e6e9f0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#0a2540]">Tindakan Saya</h3>
                <p className="text-xs text-[#758196] mt-0.5">Tugas &amp; tinjauan yang ditugaskan ke Anda</p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs font-bold text-[#0a2540]">
                {myActionItems.length}
              </Badge>
            </div>

            <div className="p-4 space-y-2.5">
              {myActionItems.length > 0 ? (
                myActionItems.map((req, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => onNavigate('csl-requests')} 
                    className="p-3 rounded-xl bg-[#fafbfc] dark:bg-slate-900/60 hover:bg-[#f6f7f9] dark:hover:bg-slate-800/60 transition-colors border border-[#e6e9f0] dark:border-slate-800 cursor-pointer space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#0a2540]">{req.request_number}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {req.status === 'REVIEW_USER' ? 'Perlu Review' : 'Ditugaskan ke Anda'}
                      </span>
                    </div>
                    <p className="text-xs text-[#758196] truncate">{req.description || 'Tidak ada deskripsi'}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#758196] space-y-1">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-600 mb-2" />
                  <p className="text-xs font-bold text-[#0a2540]">Semua Tugas Selesai!</p>
                  <p className="text-[11px]">Tidak ada tindakan tertunda yang membutuhkan perhatian Anda.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tugas & Kepatuhan Mendatang Card */}
          <div className="rounded-2xl border border-[#e6e9f0] bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e6e9f0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#0a2540]">Tugas &amp; Kepatuhan Mendatang</h3>
                <p className="text-xs text-[#758196] mt-0.5">Jadwal RUPS, aset &amp; kepatuhan berkala</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('routine-rups')} 
                className="h-8 text-xs font-semibold gap-1 text-[#0a2540] hover:bg-[#f6f7f9]"
              >
                Lihat Semua <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="p-4 space-y-2.5">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task, idx) => {
                  const isTaskOverdue = task.due_date && new Date(task.due_date) < new Date();
                  const badge = getUnifiedStatusBadge(task.status);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigate('routine-rups')}
                      className={`p-3 rounded-xl border space-y-1.5 cursor-pointer transition-colors ${
                        isTaskOverdue 
                          ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/50' 
                          : 'bg-[#fafbfc] dark:bg-slate-900/60 border-[#e6e9f0] dark:border-slate-800 hover:bg-[#f6f7f9] dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase text-[#0a2540] tracking-wider">
                              {task.category || 'Rutinitas'}
                            </span>
                            {isTaskOverdue && (
                              <span className="text-[10px] font-bold text-rose-700 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Lewat Tenggat
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#16233a] truncate mt-0.5">
                            {task.task_name || task.company || 'Tugas Tanpa Nama'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className} shrink-0`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                          {badge.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-[#758196] pt-1 border-t border-[#e6e9f0]">
                        <span>PIC: <strong className="font-semibold text-[#0a2540]">{task.owner || '-'}</strong></span>
                        <span className={isTaskOverdue ? 'text-rose-700 font-semibold' : ''}>
                          {task.due_date || task.finish_date 
                            ? formatCslDate(task.due_date || task.finish_date)
                            : 'Tanpa tanggal'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-[#758196]">
                  Tidak ada tugas mendatang.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
