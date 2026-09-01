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
    pendingTasks: 0,
    pendingExpenses: 0,
    completedRequests: 0,
    totalRequests: 0,
    slaCompliantRequests: 0
  });

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    DRAFT: 0, SUBMITTED: 0, PROCESSING: 0, REVIEW_USER: 0, COMPLETED: 0
  });

  const [myActionItems, setMyActionItems] = useState<any[]>([]);

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
          
          // Basic SLA Logic
          let compliantCount = 0;
          completed.forEach(r => {
             if (r.sla_due_date) {
               if (new Date(r.updated_at) <= new Date(r.sla_due_date)) compliantCount++;
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
          const myId = currentUser?.id || '';
          const myName = currentUser?.fullName || '';
          const actionItems = requests.filter(r => 
             !['COMPLETED', 'CLOSED', 'REJECTED'].includes(r.status) &&
             (r.assigned_pic_id === myId || r.assigned_pic_name === myName || (r.status === 'REVIEW_USER' && r.requester_email === currentUser?.email))
          );
          setMyActionItems(actionItems.slice(0, 4));

          setStats(prev => ({
            ...prev,
            activeRequests: active.length,
            completedRequests: completed.length,
            totalRequests: requests.length,
            slaCompliantRequests: compliantCount
          }));
          
          setRecentRequests(requests.slice(0, 5));
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

  const slaPercentage = stats.completedRequests > 0 
    ? Math.round((stats.slaCompliantRequests / stats.completedRequests) * 100) 
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
          { label: 'SLA Compliance', value: `${slaPercentage}%`, icon: ShieldCheck, sub1: 'Performance', sub2: 'Requests met SLA targets', color: '#C9A84C', route: 'reports-request' },
        ].map((kpi, i) => {
          // Map hardcoded colors to dark-mode-safe Tailwind classes
          const isNavy = kpi.color === '#0B1A35';
          const isGold = kpi.color === '#C9A84C';
          return (
          <div key={i} onClick={() => onNavigate(kpi.route)}
            className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-slate-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">{kpi.label}</span>
              <div className={`rounded-xl p-2.5 group-hover:scale-110 transition-transform ${
                isNavy
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
              }`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{kpi.value}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center ${
                isNavy
                  ? 'text-slate-600 dark:text-slate-300'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {i % 2 === 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />} {kpi.sub1}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">{kpi.sub2}</p>
          </div>
          );
        })}
      </div>

      {/* Quick Access Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">CSL Modules Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { id: 'csl-requests', label: 'Ticketing / Request', icon: Kanban, route: 'csl-all-requests' },
            { id: 'routine', label: 'Task & Routine', icon: Calendar, route: 'routine-task' },
            { id: 'budget', label: 'Budget & Cost', icon: Wallet, route: 'budget-expense' },
            { id: 'directory', label: 'Phone Directory', icon: PhoneCall, route: 'directory-all' },
            { id: 'reports', label: 'Reports & SLA', icon: TrendingUp, route: 'reports-request' },
          ].map((item, i) => {
            const Icon = item.icon;
            const isGold = i % 2 === 1;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-200 group text-center"
              >
                <div className={`p-3 rounded-2xl mb-3 group-hover:scale-110 transition-transform ${
                  isGold
                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
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
        {/* Left Column: Recent Requests & Action Items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Breakdown Mini */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">Requests by Status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { status: 'DRAFT', count: statusCounts.DRAFT, color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300' },
                { status: 'SUBMITTED', count: statusCounts.SUBMITTED, color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50 dark:text-indigo-400' },
                { status: 'PROCESSING', count: statusCounts.PROCESSING, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400' },
                { status: 'REVIEW', count: statusCounts.REVIEW_USER, color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-400' },
                { status: 'COMPLETED', count: statusCounts.COMPLETED, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400' },
              ].map((s) => (
                <div key={s.status} className={`flex flex-col items-center justify-center p-3 rounded-xl border ${s.color}`}>
                  <span className="text-2xl font-black">{s.count}</span>
                  <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{s.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Recent Legal Requests</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('csl-all-requests')} 
              className="text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {recentRequests.length > 0 ? (
                recentRequests.map((req, idx) => {
                  const isOverdue = req.sla_due_date && new Date(req.sla_due_date) < new Date() && !['COMPLETED','CLOSED','REJECTED'].includes(req.status);
                  return (
                  <div key={idx} className="p-5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{req.request_number}</span>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                          {req.department || req.company || 'General'}
                        </span>
                        {isOverdue && (
                          <span className="flex items-center text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200 uppercase">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[20rem] md:max-w-md">{req.description || 'Tanpa deskripsi'}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">PIC: {req.assigned_pic_name || 'Belum di-assign'} • {new Date(req.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="shrink-0">
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-md border ${
                        ['COMPLETED', 'CLOSED'].includes(req.status)
                          ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
                          : ['PROCESSING', 'RESPONDED'].includes(req.status)
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/40'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10'
                      }`}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-sm font-medium text-slate-500">Belum ada request baru.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Action Items & Active Tasks */}
        <div className="space-y-6">
          
          {/* Action Items */}
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">My Action Items</h2>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
              {myActionItems.length > 0 ? myActionItems.map((req, idx) => (
                <div key={idx} onClick={() => onNavigate('csl-all-requests')} className="cursor-pointer p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 transition-colors border border-slate-100 dark:border-zinc-700">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{req.request_number}</span>
                    <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                      {req.status === 'REVIEW_USER' ? 'Review Needed' : 'Assigned'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{req.description}</p>
                </div>
              )) : (
                <div className="text-center py-6 text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold">You're all caught up!</p>
                </div>
              )}
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
              {upcomingTasks.length > 0 ? upcomingTasks.map((task, idx) => {
                const isTaskOverdue = task.due_date && new Date(task.due_date) < new Date();
                return (
                <div key={idx} className={`p-3.5 rounded-xl border space-y-2 ${isTaskOverdue ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100 dark:bg-zinc-800/50 dark:border-white/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block">{task.category}</span>
                        {isTaskOverdue && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      </div>
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
                    <span className={isTaskOverdue ? 'text-red-600 font-bold' : ''}>{task.due_date || task.finish_date ? new Date(task.due_date || task.finish_date).toLocaleDateString('id-ID') : 'No Date'}</span>
                  </div>
                </div>
                );
              }) : (
                <div className="text-center text-sm font-medium text-slate-500 py-4">Belum ada task aktif.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
