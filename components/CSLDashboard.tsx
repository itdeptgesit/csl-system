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
    routinesDue: 0,
    completedRequests: 0,
    totalRequests: 0
  });

  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [upcomingRoutines, setUpcomingRoutines] = useState<any[]>([]);

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

        // Fetch routines (dummy for now if table is empty)
        const { data: routines } = await supabase
          .from('csl_routines')
          .select('*')
          .order('due_date', { ascending: true })
          .limit(3);
        
        if (routines && routines.length > 0) {
          setUpcomingRoutines(routines);
          const pending = routines.filter(r => r.status !== 'COMPLETED');
          setStats(prev => ({ ...prev, routinesDue: pending.length }));
        } else {
          // If no routines exist yet, just use a placeholder to keep the UI looking nice
          setUpcomingRoutines([
             { id: 1, title: 'Monthly Tax Report Filing (Mock)', due_date: '2026-08-15', status: 'PENDING', priority: 'High' }
          ]);
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-40 -bottom-10 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Corporate Secretary & Legal ERP</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              Welcome back, {firstName}!
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Overview of organizational legal requests, compliance routines, document repository, and department budget.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => onNavigate('csl-create-request')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-10 px-5 shadow-lg shadow-indigo-600/30 rounded-xl"
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
        <div 
          onClick={() => onNavigate('csl-all-requests')}
          className="group cursor-pointer rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-500/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Requests</span>
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Kanban className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{stats.activeRequests}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> Live
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Requests currently processing</p>
        </div>

        <div 
          onClick={() => onNavigate('routine-monitoring')}
          className="group cursor-pointer rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-amber-500/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Routines Due</span>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{stats.routinesDue}</span>
            <span className="text-xs font-semibold text-amber-600 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-0.5" /> Action needed
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Upcoming compliance & reports</p>
        </div>

        <div 
          onClick={() => onNavigate('reports-sla')}
          className="group cursor-pointer rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-emerald-500/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SLA Fulfillment</span>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{slaPercentage}%</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-0.5" /> On track
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Based on completed vs total</p>
        </div>

        <div 
          onClick={() => onNavigate('documents-all')}
          className="group cursor-pointer rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-500/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Documents Vault</span>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-2.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <FolderOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{stats.totalDocuments}</span>
            <span className="text-xs font-semibold text-blue-600 font-mono">Agreements & Legal</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Safely stored in system</p>
        </div>
      </div>

      {/* Quick Access Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">CSL Modules Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { id: 'csl-requests', label: 'Ticketing / Request', icon: Kanban, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30', route: 'csl-all-requests' },
            { id: 'routine', label: 'Routine Activity', icon: Calendar, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', route: 'routine-monitoring' },
            { id: 'documents', label: 'Documents Vault', icon: FolderOpen, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30', route: 'documents-all' },
            { id: 'budget', label: 'Budget & Cost', icon: Wallet, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', route: 'budget-plan' },
            { id: 'directory', label: 'Phone Directory', icon: PhoneCall, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30', route: 'directory-all' },
            { id: 'reports', label: 'Reports & SLA', icon: TrendingUp, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30', route: 'reports-sla' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-border/40 bg-card hover:bg-muted/40 transition-all duration-200 group text-center"
              >
                <div className={`p-3 rounded-2xl ${item.color} mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
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
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">Recent Legal Requests</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('csl-all-requests')} 
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
            <div className="divide-y divide-border/20">
              {recentRequests.length > 0 ? (
                recentRequests.map((req, idx) => (
                  <div key={idx} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-600">{req.request_number}</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {req.department || req.company || 'General'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{req.description || 'Tanpa deskripsi'}</p>
                      <p className="text-xs text-muted-foreground">PIC: {req.assigned_pic_name || 'Belum di-assign'} • {new Date(req.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                        ['COMPLETED', 'CLOSED'].includes(req.status) ? 'bg-emerald-100 text-emerald-700' :
                        ['PROCESSING', 'RESPONDED'].includes(req.status) ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">Belum ada request baru.</div>
              )}
            </div>
          </div>
        </div>

        {/* Routines & Compliance Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">Upcoming Routines</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onNavigate('routine-monitoring')} 
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Monitor <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3 shadow-sm">
            {upcomingRoutines.map((routine, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border/20 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{routine.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    routine.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {routine.due_date ? new Date(routine.due_date).toLocaleDateString() : 'No date'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Status: <strong className="text-foreground">{routine.status?.replace(/_/g, ' ')}</strong></span>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => onNavigate('routine-monitoring')}
                    className="h-auto p-0 text-indigo-600 text-xs font-bold"
                  >
                    Details &rarr;
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
