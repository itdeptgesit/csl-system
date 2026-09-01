import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { 
  Download, 
  Filter, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  PieChart, 
  Wallet,
  CheckSquare,
  FileBarChart
} from 'lucide-react';

interface CSLReportsManagerProps {
  currentUser: UserAccount | null;
  view?: 'request' | 'task' | 'budget';
}

export const CSLReportsManager: React.FC<CSLReportsManagerProps> = ({ currentUser, view = 'request' }) => {
  const [loading, setLoading] = useState(true);

  // States for Requests
  const [requests, setRequests] = useState<any[]>([]);
  // States for Tasks
  const [tasks, setTasks] = useState<any[]>([]);
  // States for Budget
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (view === 'request') {
          const { data } = await supabase.from('csl_requests').select('*').order('created_at', { ascending: false });
          if (data) setRequests(data);
        } else if (view === 'task') {
          const { data } = await supabase.from('csl_tasks').select('*').order('created_at', { ascending: false });
          if (data) setTasks(data);
        } else if (view === 'budget') {
          const { data } = await supabase.from('csl_expense_approvals').select('*').order('created_at', { ascending: false });
          if (data) setExpenses(data);
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [view]);

  // ── SUB-PAGE 1: REQUEST REPORT ──────────────────────────────────
  if (view === 'request') {
    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => ['COMPLETED', 'CLOSED'].includes(r.status)).length;
    const activeRequests = requests.filter(r => !['COMPLETED', 'CLOSED', 'REJECTED'].includes(r.status)).length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;
    
    // Group by department
    const deptStats = requests.reduce((acc: Record<string, number>, curr) => {
      const dept = curr.department || 'General';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    const topDept = Object.entries(deptStats).sort((a, b) => (b[1] as number) - (a[1] as number))[0] || ['-', 0];

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Request Volume & SLA Report" description="Comprehensive analysis of incoming legal and corporate secretary requests">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9">
              <Filter size={13} className="mr-1.5" /> Filter Period
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shadow-md">
              <Download size={13} className="mr-1.5" /> Export PDF
            </Button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Requests</span>
            <p className="text-3xl font-black text-foreground mt-1">{totalRequests}</p>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block"><TrendingUp size={12} className="inline mr-1"/> Live Data</span>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Completed</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">{completedRequests}</p>
            <span className="text-xs text-muted-foreground font-semibold mt-1 inline-block">{(totalRequests ? (completedRequests/totalRequests*100).toFixed(1) : 0)}% completion rate</span>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Active / Processing</span>
            <p className="text-3xl font-black text-indigo-600 mt-1">{activeRequests}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Top Requesting Dept</span>
            <p className="text-3xl font-black text-foreground mt-1">{topDept[0]}</p>
            <span className="text-xs text-indigo-600 font-semibold mt-1 inline-block">{String(topDept[1])} requests</span>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest w-[120px]">Request No</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Description</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Department</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data request.</TableCell></TableRow>
              ) : (
                requests.slice(0, 15).map((req, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/40">
                    <TableCell className="font-bold text-xs text-indigo-600">{req.request_number}</TableCell>
                    <TableCell className="text-xs font-medium text-foreground max-w-[300px] truncate">{req.description}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{req.department || req.company}</TableCell>
                    <TableCell>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                        ['COMPLETED', 'CLOSED'].includes(req.status)
                          ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
                          : ['PROCESSING', 'RESPONDED'].includes(req.status)
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/40'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10'
                      }`}>
                        {req.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── SUB-PAGE 2: TASK REPORT ─────────────────────────────────
  if (view === 'task') {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In progress').length;
    const blockedTasks = tasks.filter(t => t.status === 'Blocked').length;

    // Group by Category
    const catStats = tasks.reduce((acc: Record<string, number>, curr) => {
      const cat = curr.category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Task & Routine Activity Report" description="Tracking statutory tax filings, quarterly compliance audits, and OSS renewals">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9">
              <Filter size={13} className="mr-1.5" /> Filter Period
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shadow-md">
              <Download size={13} className="mr-1.5" /> Export PDF
            </Button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Tasks</span>
            <p className="text-3xl font-black text-foreground mt-1">{totalTasks}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Completed</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">{completedTasks}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">In Progress</span>
            <p className="text-3xl font-black text-indigo-600 mt-1">{inProgressTasks}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Blocked / Issues</span>
            <p className="text-3xl font-black text-red-600 mt-1">{blockedTasks}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold mb-4">Task Categories</h3>
            <div className="space-y-3">
              {(Object.entries(catStats) as [string, number][]).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{cat}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">{count}</span>
                </div>
              ))}
              {Object.keys(catStats).length === 0 && (
                <div className="text-xs text-muted-foreground">Tidak ada kategori.</div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Category</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Task Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Owner</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada data task.</TableCell></TableRow>
                ) : (
                  tasks.slice(0, 10).map((t, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/40">
                      <TableCell className="font-bold text-xs text-indigo-600">{t.category}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{t.task_name || t.company || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.owner || '-'}</TableCell>
                      <TableCell>
                        <span className="text-[9px] font-black uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{t.status || 'Pending'}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  // ── SUB-PAGE 3: BUDGET REPORT ───────────────────────────
  if (view === 'budget') {
    const totalExpenses = expenses.length;
    const approved = expenses.filter(e => e.status === 'Approved').length;
    const totalAmount = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const approvedAmount = expenses.filter(e => e.status === 'Approved').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Budget & Expenses Report" description="Analysis of departmental spending, expense approvals, and budget utilization">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9">
              <Filter size={13} className="mr-1.5" /> Filter Period
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9 px-4 shadow-md">
              <Download size={13} className="mr-1.5" /> Export PDF
            </Button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Budget Requested</span>
            <p className="text-2xl font-black text-foreground mt-1 truncate">{formatCurrency(totalAmount)}</p>
            <span className="text-xs text-muted-foreground mt-1 inline-block">From {totalExpenses} requests</span>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Approved Spending</span>
            <p className="text-2xl font-black text-emerald-600 mt-1 truncate">{formatCurrency(approvedAmount)}</p>
            <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">From {approved} approvals</span>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Pending Review</span>
            <p className="text-3xl font-black text-amber-600 mt-1">{expenses.filter(e => e.status === 'Pending').length}</p>
            <span className="text-xs text-amber-600 font-semibold mt-1 inline-block">Requires action</span>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest w-[120px]">Req No</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Applicant</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Purpose</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Amount (IDR)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : expenses.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data expense.</TableCell></TableRow>
              ) : (
                expenses.slice(0, 15).map((exp, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/40">
                    <TableCell className="font-bold text-xs text-indigo-600">{exp.request_no}</TableCell>
                    <TableCell className="text-xs font-medium text-foreground">{exp.applicant_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[300px] truncate">{exp.purpose}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-foreground text-right">{formatCurrency(Number(exp.amount))}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                        exp.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/40'
                          : exp.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/40'
                          : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700/40'
                      }`}>
                        {exp.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return null;
};
