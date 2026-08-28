import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { 
  Kanban, 
  Calendar, 
  FolderOpen, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  TrendingUp, 
  FileText, 
  ShieldCheck, 
  PhoneCall, 
  ArrowUpRight 
} from 'lucide-react';

interface CSLDashboardProps {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export const CSLDashboard: React.FC<CSLDashboardProps> = ({ currentUser, onNavigate }) => {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'User';

  const [stats, setStats] = useState({
    activeRequests: 0,
    totalDocuments: 0,
    pendingTasks: 0,
    pendingExpenses: 0,
    completedRequests: 0,
    totalRequests: 0
  });

  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch requests
        const { data: requests } = await supabase
          .from('csl_requests')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (requests) {
          const active = requests.filter(r => !['COMPLETED', 'CLOSED', 'REJECTED'].includes(r.status));
          const completed = requests.filter(r => r.status === 'COMPLETED' || r.status === 'CLOSED');
          setStats(prev => ({
            ...prev,
            activeRequests: active.length,
            completedRequests: completed.length,
            totalRequests: requests.length
          }));
          
          setRecentRequests(requests.slice(0, 5));
        }

        // Fetch documents
        const { count: docCount } = await supabase
          .from('csl_documents')
          .select('*', { count: 'exact', head: true });
        
        if (docCount !== null) {
          setStats(prev => ({ ...prev, totalDocuments: docCount }));
        }

        // Fetch tasks
        const { data: tasks } = await supabase
          .from('csl_tasks')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (tasks) {
          const pending = tasks.filter(t => t.status !== 'Completed');
          setStats(prev => ({ ...prev, pendingTasks: pending.length }));
          setUpcomingTasks(pending.slice(0, 3));
        }

        // Fetch expenses
        const { data: expenses } = await supabase
          .from('csl_expense_approvals')
          .select('*');
        if (expenses) {
          const pendingEx = expenses.filter(e => e.status === 'Pending');
          setStats(prev => ({ ...prev, pendingExpenses: pendingEx.length }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const slaPercentage = stats.totalRequests > 0 
    ? Math.round((stats.completedRequests / stats.totalRequests) * 100) 
    : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 font-sans">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl"
           style={{ background: 'linear-gradient(160deg, #0B1A35 0%, #0D2145 50%, #0a1830 100%)' }}>
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-40 -bottom-10 h-48 w-48 rounded-full bg-[#C9A84C]/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase backdrop-blur-md border border-white/10"
                 style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#C9A84C' }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Corporate Secretary & Legal ERP</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              Welcome back, {firstName}!
            </h1>
            <p className="text-sm text-white/70 max-w-xl font-medium">
              Overview of organizational legal requests, compliance routines, document repository, and department budget.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => onNavigate('csl-create-request')}
              className="font-bold text-xs h-10 px-5 shadow-lg rounded-xl transition-all hover:scale-105"
              style={{ backgroundColor: '#C9A84C', color: '#0B1A35' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Request
            </Button>
            <Button
              onClick={() => onNavigate('csl-all-requests')}
              variant="outline"
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs h-10 px-5 rounded-xl backdrop-blur-md"
            >
              View Requests
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Active Requests', value: stats.activeRequests, icon: Kanban, sub1: 'Live', sub2: 'Requests currently processing', color: '#0B1A35', route: 'csl-all-requests' },
          { label: 'Pending Tasks', value: stats.pendingTasks, icon: Calendar, sub1: 'Action needed', sub2: 'Routine & Agreement tasks', color: '#C9A84C', route: 'routine-task' },
          { label: 'Pending Expenses', value: stats.pendingExpenses, icon: Wallet, sub1: 'Approval needed', sub2: 'Budget & Cost requests', color: '#0B1A35', route: 'budget-expense' },
          { label: 'Documents Vault', value: stats.totalDocuments, icon: FolderOpen, sub1: 'Agreements & Legal', sub2: 'Safely stored in system', color: '#C9A84C', route: 'documents-all' },
        ].map((kpi, i) => (
          <div key={i} onClick={() => onNavigate(kpi.route)}
            className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-slate-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">{kpi.label}</span>
              <div className="rounded-xl p-2.5 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{kpi.value}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center" style={{ color: kpi.color }}>
                {i % 2 === 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />} {kpi.sub1}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">{kpi.sub2}</p>
          </div>
        ))}
      </div>

      {/* Quick Access Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">CSL Modules Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { id: 'csl-requests', label: 'Ticketing / Request', icon: Kanban, route: 'csl-all-requests' },
            { id: 'routine', label: 'Task & Routine', icon: Calendar, route: 'routine-task' },
            { id: 'documents', label: 'Documents Vault', icon: FolderOpen, route: 'documents-all' },
            { id: 'budget', label: 'Budget & Cost', icon: Wallet, route: 'budget-expense' },
            { id: 'directory', label: 'Phone Directory', icon: PhoneCall, route: 'directory-all' },
            { id: 'reports', label: 'Reports & SLA', icon: TrendingUp, route: 'reports-request' },
          ].map((item, i) => {
            const Icon = item.icon;
            const isGold = i % 2 === 1;
            const color = isGold ? '#C9A84C' : '#0B1A35';
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-200 group text-center"
              >
                <div className={`p-3 rounded-2xl mb-3 group-hover:scale-110 transition-transform`} style={{ backgroundColor: `${color}10`, color }}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Requests Summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Recent Legal Requests</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('csl-all-requests')} 
              className="text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800"
              style={{ color: '#0B1A35' }}
            >
              View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {recentRequests.length > 0 ? (
                recentRequests.map((req, idx) => (
                  <div key={idx} className="p-5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold" style={{ color: '#0B1A35' }}>{req.request_number}</span>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                          {req.department || req.company || 'General'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{req.description || 'Tanpa deskripsi'}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">PIC: {req.assigned_pic_name || 'Belum di-assign'} • {new Date(req.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div>
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-md border ${
                        ['COMPLETED', 'CLOSED'].includes(req.status) ? 'bg-[#0B1A35]/10 text-[#0B1A35] border-[#0B1A35]/20' :
                        ['PROCESSING', 'RESPONDED'].includes(req.status) ? 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20' : 
                        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10'
                      }`}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm font-medium text-slate-500">Belum ada request baru.</div>
              )}
            </div>
          </div>
        </div>

        {/* Active Tasks & Compliance Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Active Tasks</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('routine-task')} 
              className="text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800"
              style={{ color: '#C9A84C' }}
            >
              View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-sm">
            {upcomingTasks.length > 0 ? upcomingTasks.map((task, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-zinc-800/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-indigo-600 block mb-0.5">{task.category}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{task.task_name || task.company || 'Unnamed Task'}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                    task.status === 'In progress' ? 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20' : 
                    task.status === 'Blocked' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20' : 
                    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10'
                  }`}>
                    {task.status || 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>PIC: <strong className="text-slate-900 dark:text-white">{task.owner || '-'}</strong></span>
                  <span>{task.due_date || task.finish_date ? new Date(task.due_date || task.finish_date).toLocaleDateString('id-ID') : 'No Date'}</span>
                </div>
              </div>
            )) : (
              <div className="text-center text-sm font-medium text-slate-500 py-4">Belum ada task aktif.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
