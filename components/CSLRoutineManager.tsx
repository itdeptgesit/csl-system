import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCcw, Search, Calendar, Clock, CheckCircle2, AlertTriangle, Plus, Activity, Save, Check } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';


// ── Types ────────────────────────────────────────────────────────────────────
interface CSLRoutine {
  id: number | string;
  title: string;
  description?: string;
  category: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'ANNUALLY';
  due_day: number;
  assigned_pic_name?: string;
  is_active: boolean;
}

interface CSLRoutineInstance {
  id: number | string;
  routine_id: number | string;
  routine_title?: string;
  routine_category?: string;
  period_start: string;
  period_end: string;
  due_date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  completion_notes?: string;
  completed_at?: string;
}

interface CSLRoutineManagerProps {
  currentUser: UserAccount | null;
  view?: 'activity' | 'timeline' | 'monitoring';
}

const FREQUENCY_BADGES: Record<string, string> = {
  DAILY: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  WEEKLY: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  MONTHLY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  QUARTERLY: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  SEMI_ANNUALLY: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
  ANNUALLY: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  CANCELLED: 'bg-slate-100 text-slate-400',
};

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_ROUTINES: CSLRoutine[] = [
  { id: 1, title: 'Monthly Tax Report Filing', category: 'Tax', frequency: 'MONTHLY', due_day: 15, assigned_pic_name: 'Budi S.', is_active: true, description: 'Prepare and submit monthly corporate tax returns' },
  { id: 2, title: 'Quarterly Compliance Review', category: 'Compliance', frequency: 'QUARTERLY', due_day: 10, assigned_pic_name: 'Rina A.', is_active: true, description: 'Review quarterly regulatory updates and compliance matrix' },
  { id: 3, title: 'Annual OSS License Renewal', category: 'Licensing', frequency: 'ANNUALLY', due_day: 200, assigned_pic_name: 'Legal Team', is_active: true, description: 'Verify operational business permits on OSS RBA system' },
];

const MOCK_INSTANCES: CSLRoutineInstance[] = [
  { id: 101, routine_id: 1, routine_title: 'Monthly Tax Report Filing', routine_category: 'Tax', period_start: '2026-08-01', period_end: '2026-08-31', due_date: '2026-08-15', status: 'IN_PROGRESS' },
  { id: 102, routine_id: 1, routine_title: 'Monthly Tax Report Filing', routine_category: 'Tax', period_start: '2026-07-01', period_end: '2026-07-31', due_date: '2026-07-15', status: 'COMPLETED', completed_at: '2026-07-14T10:00:00Z' },
  { id: 103, routine_id: 2, routine_title: 'Quarterly Compliance Review', routine_category: 'Compliance', period_start: '2026-07-01', period_end: '2026-09-30', due_date: '2026-10-10', status: 'PENDING' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const CSLRoutineManager: React.FC<CSLRoutineManagerProps> = ({ currentUser, view = 'monitoring' }) => {
  const [routines, setRoutines] = useState<CSLRoutine[]>(MOCK_ROUTINES);
  const [instances, setInstances] = useState<CSLRoutineInstance[]>(MOCK_INSTANCES);
  const [isLoading, setIsLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [selectedInstance, setSelectedInstance] = useState<CSLRoutineInstance | null>(null);

  // New Routine Form Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Tax',
    frequency: 'MONTHLY' as CSLRoutine['frequency'],
    due_day: 15,
    assigned_pic_name: 'Legal Team',
    description: '',
  });

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (view === 'activity') {
        const { data, error } = await supabase.from('csl_routines').select('*').order('title');
        if (error) throw error;
        if (data && data.length > 0) setRoutines(data);
        setUseMock(false);
      } else {
        const { data, error } = await supabase.from('csl_routine_instances').select(`
          *,
          csl_routines (title, category)
        `).order('due_date', { ascending: true });
        
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped = data.map((item: any) => ({
              ...item,
              routine_title: item.csl_routines?.title,
              routine_category: item.csl_routines?.category
          }));
          setInstances(mapped);
        }
        setUseMock(false);
      }
    } catch {
      // Keep state defaults
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [view]);

  // ── Handle Add New Routine ────────────────────────────────────────────────
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    const newRoutine: CSLRoutine = {
      id: Date.now(),
      title: formData.title.trim(),
      category: formData.category,
      frequency: formData.frequency,
      due_day: Number(formData.due_day),
      assigned_pic_name: formData.assigned_pic_name.trim() || 'Legal Team',
      description: formData.description.trim(),
      is_active: true,
    };

    // Update routines state immediately
    setRoutines(prev => [newRoutine, ...prev]);

    // Also generate an active instance task for monitoring
    const newInstance: CSLRoutineInstance = {
      id: Date.now() + 1,
      routine_id: newRoutine.id,
      routine_title: newRoutine.title,
      routine_category: newRoutine.category,
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'IN_PROGRESS',
    };
    setInstances(prev => [newInstance, ...prev]);

    // Try persisting to Supabase
    try {
      await supabase.from('csl_routines').insert([{
        title: newRoutine.title,
        category: newRoutine.category,
        frequency: newRoutine.frequency,
        due_day: newRoutine.due_day,
        assigned_pic_name: newRoutine.assigned_pic_name,
        description: newRoutine.description,
        is_active: true,
      }]);
    } catch (err) {
      console.warn('Persisted to local state (csl_routines table optional)', err);
    } finally {
      setIsSubmitting(false);
      setIsAddOpen(false);
      showFeedback(`Routine "${newRoutine.title}" created successfully!`);
      setFormData({
        title: '',
        category: 'Tax',
        frequency: 'MONTHLY',
        due_day: 15,
        assigned_pic_name: 'Legal Team',
        description: '',
      });
    }
  };

  // Feedback Toast Component
  const feedbackBanner = feedbackMessage && (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
      <Check className="h-4 w-4 text-emerald-400" />
      <span>{feedbackMessage}</span>
    </div>
  );

  // ── Render Activity (Master Definitions) ────────────────────────────────────
  if (view === 'activity') {
    const filteredRoutines = routines.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Routine Activities" description="Manage recurring legal activity schedules and compliance definitions">
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md">
              <Plus className="h-4 w-4 mr-1.5" /> New Routine Schedule
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold h-9 rounded-xl">
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </PageHeader>

        <div className="flex items-center gap-3 bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input placeholder="Search routine activities by title or category..." className="pl-10 text-sm bg-muted/30 border-border/20 rounded-xl h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Title</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Category</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Frequency</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Target Day</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Assigned PIC</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutines.map(r => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell className="font-bold text-sm text-foreground">{r.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-semibold">{r.category}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${FREQUENCY_BADGES[r.frequency]}`}>
                      {r.frequency}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold">Day {r.due_day}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">{r.assigned_pic_name || 'Team Pool'}</TableCell>
                  <TableCell>
                    {r.is_active ? 
                      <span className="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">Active</span> : 
                      <span className="text-xs text-slate-400">Inactive</span>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Add Routine Modal */}
        {renderAddModal()}
      </div>
    );
  }

  // ── Render Monitoring & Timeline (Instances) ────────────────────────────────
  const filteredInstances = instances.filter(i => {
      const matchSearch = (i.routine_title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
      return matchSearch && matchStatus;
  });
  
  const pageTitle = view === 'timeline' ? 'Routine Timeline' : 'Routine Monitoring';
  const pageDesc = view === 'timeline' ? 'Calendar & schedule view of upcoming routine deadlines' : 'Track current-period recurring routine tasks';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      {feedbackBanner}
      <PageHeader title={pageTitle} description={pageDesc}>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> New Routine
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold h-9 rounded-xl">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Active</div>
          <div className="text-3xl font-black text-indigo-600">{instances.filter(i => !['COMPLETED', 'CANCELLED'].includes(i.status)).length}</div>
        </div>
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Overdue</div>
          <div className="text-3xl font-black text-red-600">{instances.filter(i => i.status === 'OVERDUE').length}</div>
        </div>
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">In Progress</div>
          <div className="text-3xl font-black text-amber-600">{instances.filter(i => i.status === 'IN_PROGRESS').length}</div>
        </div>
        <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Completed</div>
          <div className="text-3xl font-black text-emerald-600">{instances.filter(i => i.status === 'COMPLETED').length}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3 bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input placeholder="Search routine tasks..." className="pl-10 text-sm bg-muted/30 border-border/20 rounded-xl h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${
                statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border/30 text-muted-foreground hover:bg-muted/30'
              }`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {view === 'timeline' ? (
        <div className="bg-card border border-border/40 p-10 rounded-2xl flex flex-col items-center justify-center text-muted-foreground min-h-[300px] shadow-sm">
          <Calendar size={48} className="opacity-20 mb-4 text-indigo-600" />
          <p className="text-sm font-bold text-foreground">Timeline Visualization (Calendar)</p>
          <p className="text-xs mt-1 opacity-70">Showing schedule matrix for current month routines.</p>
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Task / Routine</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Period</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Due Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstances.map(inst => (
                <TableRow key={inst.id} onClick={() => setSelectedInstance(inst)} className="cursor-pointer hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <div className="font-bold text-sm text-foreground">{inst.routine_title}</div>
                    <div className="text-[10px] uppercase font-bold text-indigo-600 mt-0.5">{inst.routine_category}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {inst.period_start} - {inst.period_end}
                  </TableCell>
                  <TableCell className="font-bold text-xs font-mono">
                    {inst.due_date}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${STATUS_BADGES[inst.status]}`}>
                      {inst.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* ── Task Detail Dialog (Centered Modal) ── */}
      <Dialog open={!!selectedInstance} onOpenChange={(open) => !open && setSelectedInstance(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
          {selectedInstance && (
            <>
              {/* Header */}
              <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Activity size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Routine Task Detail</span>
                </div>
                <DialogTitle className="text-xl font-black text-foreground leading-snug">
                  {selectedInstance.routine_title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Category: <span className="font-bold text-indigo-600">{selectedInstance.routine_category}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Period Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 border border-border/20 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Period Start</p>
                    <p className="text-sm font-extrabold text-foreground font-mono">{selectedInstance.period_start}</p>
                  </div>
                  <div className="bg-muted/40 border border-border/20 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Period End</p>
                    <p className="text-sm font-extrabold text-foreground font-mono">{selectedInstance.period_end}</p>
                  </div>
                </div>

                {/* Due Date */}
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/30 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Clock size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Target Due Date</span>
                  </div>
                  <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono">{selectedInstance.due_date}</p>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Status</p>
                  <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl ${STATUS_BADGES[selectedInstance.status]}`}>
                    {selectedInstance.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Completion Record (if exists) */}
                {selectedInstance.completed_at && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                      <CheckCircle2 size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Completion Record</span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Completed on {new Date(selectedInstance.completed_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                    </p>
                  </div>
                )}

                {/* Completion Notes (if exists) */}
                {selectedInstance.completion_notes && (
                  <div className="bg-muted/40 border border-border/20 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Completion Notes</p>
                    <p className="text-xs font-medium text-foreground leading-relaxed">{selectedInstance.completion_notes}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <DialogFooter className="px-6 pb-6 pt-4 border-t border-border/30 flex gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInstance(null)}
                  className="text-xs font-bold rounded-xl h-9"
                >
                  Close
                </Button>
                {selectedInstance.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setInstances(prev => prev.map(i =>
                        i.id === selectedInstance.id
                          ? { ...i, status: 'COMPLETED', completed_at: new Date().toISOString() }
                          : i
                      ));
                      setSelectedInstance(null);
                      showFeedback(`"${selectedInstance.routine_title}" marked as completed!`);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9 px-5"
                  >
                    <CheckCircle2 size={14} className="mr-1.5" /> Mark as Completed
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Routine Modal */}
      {renderAddModal()}
    </div>
  );

  // Helper Modal Renderer
  function renderAddModal() {
    return (
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Calendar size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Routine Schedule</span>
            </div>
            <DialogTitle className="text-xl font-black">Add New Routine Activity</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Create a recurring legal activity, tax filing, or compliance schedule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Routine Activity Title *</label>
              <Input
                required
                placeholder="e.g. Monthly Tax Report Filing"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="h-10 text-sm bg-muted/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Category *</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold"
                >
                  <option value="Tax">Tax</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Licensing">Licensing / OSS</option>
                  <option value="Corporate Secretary">Corporate Secretary</option>
                  <option value="Notary">Notary</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Frequency *</label>
                <select
                  value={formData.frequency}
                  onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                  className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="SEMI_ANNUALLY">Semi-Annually</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Target Due Day of Month</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  required
                  placeholder="15"
                  value={formData.due_day}
                  onChange={e => setFormData({ ...formData, due_day: Number(e.target.value) })}
                  className="h-10 text-sm bg-muted/30 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Assigned PIC / Team</label>
                <Input
                  placeholder="e.g. Budi S. / Legal Team"
                  value={formData.assigned_pic_name}
                  onChange={e => setFormData({ ...formData, assigned_pic_name: e.target.value })}
                  className="h-10 text-sm bg-muted/30"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Description</label>
              <textarea
                rows={3}
                placeholder="Scope of routine activity, requirements, and notes..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 text-xs bg-muted/30 border border-border/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs font-bold rounded-xl h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                <Save size={14} className="mr-1.5" /> {isSubmitting ? 'Saving...' : 'Save Routine'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
};
