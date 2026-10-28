import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { CSLBudgetExpensesReport } from './CSLBudgetExpensesReport';
import { getUnifiedStatusBadge } from '../utils/cslStatusHelper';
import { 
  Download, 
  Filter
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (view === 'request') {
          const { data } = await supabase.from('csl_requests').select('*').order('created_at', { ascending: false });
          if (data) setRequests(data);
        } else if (view === 'task') {
          const [resRoutines, resRups] = await Promise.all([
            supabase.from('csl_routine_instances').select(`*, csl_routines(title, category, assigned_pic_name)`).order('created_at', { ascending: false }),
            supabase.from('csl_rups_ar').select('*').order('created_at', { ascending: false })
          ]);
          
          let combinedTasks: any[] = [];
          
          if (resRoutines.data) {
            combinedTasks = [...combinedTasks, ...resRoutines.data.map((r: any) => ({
              id: `routine_${r.id}`,
              category: r.csl_routines?.category || 'Routine',
              task_name: r.csl_routines?.title || 'Unknown Routine',
              owner: r.csl_routines?.assigned_pic_name || '-',
              status: r.status,
              created_at: r.created_at
            }))];
          }
          
          if (resRups.data) {
            combinedTasks = [...combinedTasks, ...resRups.data.map((r: any) => ({
              id: `rups_${r.id}`,
              category: 'RUPS-AR',
              company: r.company || 'Unknown Company',
              owner: r.owner || '-',
              status: r.status,
              created_at: r.created_at
            }))];
          }
          
          // Sort descending by created_at
          combinedTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          setTasks(combinedTasks);
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
    
    // Group by department
    const deptStats = requests.reduce((acc: Record<string, number>, curr) => {
      const dept = curr.department || 'General';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    const topDept: [string, number] = (Object.entries(deptStats) as [string, number][]).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Laporan Permintaan & Kepatuhan SLA" description="Analisis menyeluruh atas volume dan kepatuhan waktu penanganan berkas legal">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9">
              <Filter size={13} className="mr-1.5" /> Filter Periode
            </Button>
            <Button size="sm" className="bg-[#0a2540] hover:bg-[#16375c] text-white font-bold text-xs rounded-xl h-9 px-4 shadow-xs">
              <Download size={13} className="mr-1.5" /> Ekspor PDF
            </Button>
          </div>
        </PageHeader>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Permintaan</span>
            <p className="text-3xl font-black text-foreground mt-1">{totalRequests}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Selesai (Completed)</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">{completedRequests}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Aktif / Diproses</span>
            <p className="text-3xl font-black text-blue-600 mt-1">{activeRequests}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Departemen Terbanyak</span>
            <p className="text-lg font-bold text-foreground truncate mt-2">{topDept[0]}</p>
            <span className="text-[11px] text-muted-foreground font-semibold">{topDept[1]} Permintaan</span>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest w-[140px]">No. Permintaan</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Deskripsi</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Departemen</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat data laporan...</TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data permintaan.</TableCell></TableRow>
              ) : (
                requests.slice(0, 15).map((req, idx) => {
                  const badge = getUnifiedStatusBadge(req.status);
                  return (
                    <TableRow key={idx} className="hover:bg-muted/40">
                      <TableCell className="font-bold text-xs text-[#0a2540] dark:text-blue-400">{req.request_number}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground max-w-[300px] truncate">{req.description}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{req.department || req.company}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                          <span className={`size-1.5 rounded-full ${badge.dotColor}`} />
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                  );
                })
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
    const completedTasks = tasks.filter(t => t.status?.toLowerCase() === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status?.toLowerCase() === 'in progress').length;
    const blockedTasks = tasks.filter(t => t.status?.toLowerCase() === 'blocked').length;

    // Group by Category
    const catStats = tasks.reduce((acc: Record<string, number>, curr) => {
      const cat = curr.category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        <PageHeader title="Laporan & Pemantauan Tugas CSL" description="Distribusi dan status penyelesaian tugas rutin di seluruh kategori">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9">
              <Filter size={13} className="mr-1.5" /> Filter Periode
            </Button>
            <Button size="sm" className="bg-[#0a2540] hover:bg-[#16375c] text-white font-bold text-xs rounded-xl h-9 px-4 shadow-xs">
              <Download size={13} className="mr-1.5" /> Ekspor PDF
            </Button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total Tugas</span>
            <p className="text-3xl font-black text-foreground mt-1">{totalTasks}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Selesai (Completed)</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">{completedTasks}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Dalam Proses</span>
            <p className="text-3xl font-black text-blue-600 mt-1">{inProgressTasks}</p>
          </div>
          <div className="bg-card border border-border/40 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Terkendala (Blocked)</span>
            <p className="text-3xl font-black text-rose-600 mt-1">{blockedTasks}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold mb-4">Kategori Tugas</h3>
            <div className="space-y-3">
              {(Object.entries(catStats) as [string, number][]).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{cat}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">{count}</span>
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
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Kategori</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Nama Tugas / Perusahaan</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Penanggung Jawab</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Memuat data tugas...</TableCell></TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada data tugas.</TableCell></TableRow>
                ) : (
                  tasks.slice(0, 10).map((t, idx) => {
                    const badge = getUnifiedStatusBadge(t.status);
                    return (
                      <TableRow key={idx} className="hover:bg-muted/40">
                        <TableCell className="font-bold text-xs text-[#0a2540] dark:text-blue-400">{t.category}</TableCell>
                        <TableCell className="text-xs font-medium text-foreground">{t.task_name || t.company || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.owner || '-'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                            <span className={`size-1.5 rounded-full ${badge.dotColor}`} />
                            {badge.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
    return <CSLBudgetExpensesReport currentUser={currentUser} />;
  }

  return null;
};
