import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCcw, Clock, CheckCircle2, AlertTriangle, BarChart2, Star, MessageSquare, Send, Plus, Paperclip, Upload, Link, X, FolderOpen, ExternalLink, Shield, Trash2, FileText, Activity, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { getSlaStatus, SLAStatus } from '../utils/cslSlaUtils';
import { notifyRequestUpdate } from '../utils/cslNotificationUtils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CSLCreateRequest } from './CSLCreateRequest';

// ── Types ────────────────────────────────────────────────────────────────────
interface CSLCategory {
  id: number;
  code: string;
  name: string;
  sla_days: number;
  description?: string;
}

interface CSLRequest {
  id: number;
  request_number: string;
  category_id: number;
  category_name?: string;
  requester_name: string;
  requester_email: string;
  requester_id?: string;
  department: string;
  company: string;
  assigned_pic_name?: string;
  assigned_pic_id?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: string;
  description: string;
  progress: number;
  required_date?: string;
  sla_target_days: number;
  sla_due_date: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Phase 2 Fields
  csl_response?: string;
  csl_response_at?: string;
  feedback_overall_rating?: number;
  feedback_response_time_rating?: number;
  feedback_service_quality_rating?: number;
  feedback_comment?: string;
  feedback_submitted_at?: string;
}

interface CSLRequestManagerProps {
  currentUser: UserAccount | null;
  view?: 'all' | 'mine' | 'categories';
}

// ── SLA Status Styling ────────────────────────────────────────────────────────
const SLA_BADGE: Record<SLAStatus, { label: string; className: string }> = {
  ON_TRACK:          { label: 'On Track',      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  DUE_SOON:          { label: 'Due Soon',      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  DUE_TODAY:         { label: 'Due Today',     className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  OVERDUE:           { label: 'Overdue',       className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  COMPLETED_ON_TIME: { label: 'Completed ✓',  className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  COMPLETED_LATE:    { label: 'Completed Late',className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:             'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  SUBMITTED:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ACKNOWLEDGED:      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  IN_REVIEW:         'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  REVISION_REQUIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PROCESSING:        'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  COMPLETED:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  RESPONDED:         'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  CLOSED:            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  REJECTED:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED:         'bg-zinc-100 text-zinc-500',
};

const PRIORITY_BADGE: Record<string, string> = {
  Low:      'bg-slate-100 text-slate-600',
  Medium:   'bg-blue-100 text-blue-700',
  High:     'bg-amber-100 text-amber-700',
  Critical: 'bg-red-100 text-red-700',
};

// ── MOCK DATA (used when DB is offline) ──────────────────────────────────────
const MOCK_REQUESTS: CSLRequest[] = [
  {
    id: 1,
    request_number: 'CSL-202608-0001',
    category_id: 1,
    category_name: 'Agreement',
    requester_name: 'Budi Santoso',
    requester_email: 'budi@gesit.co.id',
    department: 'Finance',
    company: 'PT GESIT',
    assigned_pic_name: 'Legal Officer',
    priority: 'High',
    status: 'IN_REVIEW',
    description: 'Review distribution agreement with PT Mitra Sejati.',
    progress: 40,
    sla_target_days: 5,
    sla_due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    request_number: 'CSL-202608-0002',
    category_id: 2,
    category_name: 'Legal Review',
    requester_name: 'Rina Agustina',
    requester_email: 'rina@gesit.co.id',
    department: 'Operations',
    company: 'PT GESIT',
    assigned_pic_name: undefined,
    priority: 'Medium',
    status: 'SUBMITTED',
    description: 'Review vendor NDA draft from PT Teknologi Maju.',
    progress: 0,
    sla_target_days: 3,
    sla_due_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    request_number: 'CSL-202608-0003',
    category_id: 3,
    category_name: 'Corporate Secretary',
    requester_name: 'Ahmad Fauzi',
    requester_email: 'ahmad@gesit.co.id',
    department: 'Management',
    company: 'PT GESIT',
    assigned_pic_name: 'Secretary Officer',
    priority: 'Low',
    status: 'COMPLETED',
    description: 'Prepare board resolution for new bank account opening.',
    progress: 100,
    sla_target_days: 5,
    sla_due_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    csl_response: 'Board resolution has been drafted and signed.',
    csl_response_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

const MOCK_CATEGORIES: CSLCategory[] = [
  { id: 1, code: 'AGR',       name: 'Agreement',          sla_days: 5,  description: 'Contract drafting, revision, and review requests' },
  { id: 2, code: 'LREV',      name: 'Legal Review',       sla_days: 5,  description: 'Review of external templates and business documents' },
  { id: 3, code: 'CORPSECR',  name: 'Corporate Secretary',sla_days: 5,  description: 'Board minutes, resolutions, and statutory filings' },
  { id: 4, code: 'OSS',       name: 'OSS',                sla_days: 14, description: 'OSS system permits and licensing registration' },
  { id: 5, code: 'LIC',       name: 'Licensing',          sla_days: 10, description: 'General regional and sector-specific licenses' },
  { id: 6, code: 'NOTARY',    name: 'Notary',             sla_days: 7,  description: 'Deed preparation and notarization coordination' },
  { id: 7, code: 'LEGALOP',   name: 'Legal Opinion',      sla_days: 5,  description: 'Formal written legal analysis and advisory opinions' },
  { id: 8, code: 'DOCREQ',    name: 'Document Request',   sla_days: 2,  description: 'Retrieval of corporate documents or permits' },
  { id: 9, code: 'COMPLIANCE',name: 'Compliance',         sla_days: 5,  description: 'Regulatory reports and compliance reviews' },
  { id: 10,code: 'OTHER',     name: 'Other',              sla_days: 5,  description: 'General and miscellaneous support' },
];

// ── Categories View ───────────────────────────────────────────────────────────
const CategoriesView: React.FC<{ categories: CSLCategory[] }> = ({ categories }) => (
  <div className="space-y-6">
    <PageHeader title="Request Categories" description="SLA configuration by request type" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map(cat => (
        <div key={cat.id} className="bg-card border border-border/10 rounded-xl p-5 hover:shadow-md transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{cat.code}</span>
              <h3 className="text-sm font-bold text-foreground mt-0.5">{cat.name}</h3>
            </div>
            <span className="text-xs font-black text-primary bg-primary/10 rounded-lg px-2.5 py-1">
              {cat.sla_days}d SLA
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const CSLRequestManager: React.FC<CSLRequestManagerProps> = ({ currentUser, view = 'all' }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CSLRequest[]>([]);
  const [categories, setCategories] = useState<CSLCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [useMock, setUseMock] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Phase 2 State
  const [selectedRequest, setSelectedRequest] = useState<CSLRequest | null>(null);
  const [requestLogs, setRequestLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseForm, setResponseForm] = useState({ status: '', response: '', gdriveLink: '' });
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const [isDraggingResponse, setIsDraggingResponse] = useState(false);
  const responseFileRef = useRef<HTMLInputElement>(null);
  const [feedbackForm, setFeedbackForm] = useState({ overall: 5, responseTime: 5, quality: 5, comment: '' });
  
  // New Comment State
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Document Upload State (GDrive)
  const [requestDocuments, setRequestDocuments] = useState<any[]>([]);
  const [docForm, setDocForm] = useState({ doc_name: '', doc_type: '', gdrive_url: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);

  const isCslTeam = useMemo(() => {
    const role = currentUser?.role?.toLowerCase() || '';
    return role.includes('admin') || role.includes('staff') ||
      (currentUser?.groups || []).some(g => ['admin', 'csl_admin', 'csl_staff'].includes(g.toLowerCase()));
  }, [currentUser]);

  const isAdmin = useMemo(() => {
    const role = currentUser?.role?.toLowerCase() || '';
    return role.includes('admin') || role.includes('owner') || (currentUser?.groups || []).some(g => g.toLowerCase().includes('admin'));
  }, [currentUser]);

  // Edit & Delete State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CSLRequest>>({});
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);

  const handleDeleteRequest = async (id: number) => {
    setRequestToDelete(id);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('csl_requests').delete().eq('id', requestToDelete);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== requestToDelete));
      setSelectedRequest(null);
      toast.success('Request berhasil dihapus permanen.');
    } catch (err: any) {
      toast.error('Gagal menghapus request: ' + err.message);
    } finally {
      setRequestToDelete(null);
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editForm.id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        status: editForm.status,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('csl_requests').update(payload).eq('id', editForm.id);
      if (error) throw error;
      await fetchData();
      setIsEditDialogOpen(false);
      setEditForm({});
      toast.success('Perubahan berhasil disimpan.');
    } catch (err: any) {
      toast.error('Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch categories
      const { data: catData, error: catErr } = await supabase
        .from('csl_request_categories').select('*').order('name');
      if (!catErr && catData?.length) {
        setCategories(catData);
      } else {
        setCategories(MOCK_CATEGORIES);
        setUseMock(true);
      }

      // Fetch requests
      let query = supabase.from('csl_requests').select('*').order('created_at', { ascending: false });
      if (view === 'mine') {
          if (isCslTeam) {
              query = query.eq('assigned_pic_id', currentUser?.id);
          } else {
              query = query.eq('requester_email', currentUser?.email || '');
          }
      } else if (view === 'all') {
          if (isCslTeam && !isAdmin) {
              query = query.or(`assigned_pic_id.eq.${currentUser?.id},assigned_pic_id.is.null`);
          } else if (!isCslTeam) {
              query = query.eq('requester_email', currentUser?.email || '');
          }
      }

      const { data: reqData, error: reqErr } = await query;
      if (!reqErr && reqData) {
        setRequests(reqData);
        setUseMock(false);
      } else {
        // Use mock data filtered by view
        let filtered = MOCK_REQUESTS;
        if (view === 'mine') {
            filtered = MOCK_REQUESTS.filter(r => isCslTeam ? r.assigned_pic_name === currentUser?.fullName : r.requester_email === currentUser?.email);
        } else if (view === 'all') {
            if (isCslTeam && !isAdmin) {
                filtered = MOCK_REQUESTS.filter(r => r.assigned_pic_name === currentUser?.fullName || !r.assigned_pic_name);
            } else if (!isCslTeam) {
                filtered = MOCK_REQUESTS.filter(r => r.requester_email === currentUser?.email);
            }
        }
        setRequests(filtered);
        setUseMock(true);
      }
    } catch {
      setRequests(view === 'mine'
        ? MOCK_REQUESTS.filter(r => r.requester_email === currentUser?.email)
        : MOCK_REQUESTS);
      setCategories(MOCK_CATEGORIES);
      setUseMock(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [view, currentUser?.email]);

  // SLA metrics
  const slaStats = useMemo(() => {
    const active = requests.filter(r => !['COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(r.status));
    const done   = requests.filter(r => ['COMPLETED', 'CLOSED'].includes(r.status));
    return {
      onTrack:  active.filter(r => getSlaStatus(r.sla_due_date, r.status) === 'ON_TRACK').length,
      dueSoon:  active.filter(r => getSlaStatus(r.sla_due_date, r.status) === 'DUE_SOON').length,
      dueToday: active.filter(r => getSlaStatus(r.sla_due_date, r.status) === 'DUE_TODAY').length,
      overdue:  active.filter(r => getSlaStatus(r.sla_due_date, r.status) === 'OVERDUE').length,
      onTime:   done.filter(r  => getSlaStatus(r.sla_due_date, r.status, r.completed_at) === 'COMPLETED_ON_TIME').length,
      total:    requests.length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter !== 'ALL') list = list.filter(r => r.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r =>
        r.request_number.toLowerCase().includes(q) ||
        r.requester_name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.category_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, statusFilter, searchTerm]);
  
  const handleRowClick = async (req: CSLRequest) => {
      setSelectedRequest(req);
      setResponseForm({ status: req.status, response: req.csl_response || '', gdriveLink: '' });
      setResponseFiles([]);
      setRequestLogs([]);
      setFeedbackForm({
          overall: req.feedback_overall_rating || 5,
          responseTime: req.feedback_response_time_rating || 5,
          quality: req.feedback_service_quality_rating || 5,
          comment: req.feedback_comment || ''
      });
      // Fetch activity logs
      const { data: logs, error: logsErr } = await supabase
        .from('csl_request_logs')
        .select('*')
        .eq('request_id', req.id)
        .order('created_at', { ascending: true });
      if (logsErr) {
        console.error('❌ Failed to fetch logs:', logsErr.message);
      } else {
        console.log(`✅ Fetched ${logs?.length || 0} logs for request ${req.id}`);
        if (logs) setRequestLogs(logs);
      }
      
      // Fetch request documents
      const { data: docs } = await supabase
        .from('csl_request_documents')
        .select('*')
        .eq('request_id', req.id)
        .order('created_at', { ascending: false });
      if (docs) setRequestDocuments(docs);
  };

  const submitResponse = async () => {
      if (!selectedRequest) return;
      setIsSubmitting(true);
      
      const payload: any = {
          status: responseForm.status,
          updated_at: new Date().toISOString(),
          // Automatically set the responding staff as PIC
          assigned_pic_id: String(currentUser?.id || ''),
          assigned_pic_name: currentUser?.fullName || currentUser?.email || '',
      };
      
      if (['COMPLETED', 'REJECTED', 'RESPONDED', 'REVISION_REQUIRED'].includes(responseForm.status) && responseForm.response) {
          payload.csl_response = responseForm.response;
          payload.csl_response_at = new Date().toISOString();
          if (responseForm.status === 'COMPLETED') {
              payload.completed_at = new Date().toISOString();
          }
      }
      
      // Build response files metadata
      const existingFiles: any[] = (() => {
        try { return JSON.parse((selectedRequest as any).csl_response_files || '[]'); } catch { return []; }
      })();
      const newFileMeta: any[] = [...existingFiles];

      // Add GDrive link
      if (responseForm.gdriveLink.trim()) {
        newFileMeta.push({ type: 'gdrive', url: responseForm.gdriveLink.trim(), name: 'Google Drive Link', added_at: new Date().toISOString() });
      }

      // Upload files to Google Drive
      if (responseFiles.length > 0 && !useMock) {
        for (const file of responseFiles) {
          try {
            // Convert to Base64
            const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(f);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = e => reject(e);
            });

            const base64 = await toBase64(file);
            
            // Call edge function
            const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
              body: {
                fileName: `[Lampiran] ${file.name}`,
                fileMimeType: file.type,
                fileBase64: base64,
                requesterEmail: selectedRequest.requester_email,
                folderType: 'request'
              }
            });

            if (uploadError || !uploadData?.success) {
              console.warn('Google Drive upload failed:', file.name, uploadError?.message || uploadData?.error);
              // Fallback to supabase storage if you want, but for now just fail silently as before
            } else {
              newFileMeta.push({ 
                type: 'gdrive', 
                url: uploadData.gdriveUrl, 
                name: file.name, 
                added_at: new Date().toISOString() 
              });
            }
          } catch (err) {
            console.error('Error uploading file:', err);
          }
        }
      }

      if (newFileMeta.length > existingFiles.length) {
        payload.csl_response_files = JSON.stringify(newFileMeta);
      }
      
      try {
          if (!useMock) {
              const { error } = await supabase.from('csl_requests').update(payload).eq('id', selectedRequest.id);
              if (error) {
                  alert(`Gagal menyimpan update: ${error.message}`);
                  setIsSubmitting(false);
                  return;
              }
              await notifyRequestUpdate({ ...selectedRequest, ...payload }, 'STATUS_CHANGED', payload.csl_response);
              const statusLabel: Record<string, string> = {
                  ACKNOWLEDGED: 'Permintaan diakui dan sedang dikaji',
                  IN_REVIEW: 'Permintaan sedang dalam review',
                  PROCESSING: 'Permintaan sedang diproses',
                  REVISION_REQUIRED: 'Revisi diperlukan dari pemohon',
                  COMPLETED: 'Permintaan telah diselesaikan',
                  RESPONDED: 'Tim CSL telah memberikan respons',
                  REJECTED: 'Permintaan ditolak',
                  CLOSED: 'Permintaan ditutup',
              };
              const autoNote = responseForm.response?.trim() || statusLabel[responseForm.status] || `Status diubah ke ${responseForm.status}`;
              const { error: logErr } = await supabase.from('csl_request_logs').insert([{
                  request_id: selectedRequest.id,
                  status: responseForm.status,
                  actor_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
                  actor_id: currentUser?.id ? String(currentUser.id) : null,
                  note: autoNote,
                  has_files: newFileMeta.length > existingFiles.length,
              }]);
              if (logErr) {
                  console.warn('Log insert warning:', logErr.message);
                  // Non-fatal: status update sudah berhasil
              }
          }
          await fetchData();
          setSelectedRequest(null);
          setResponseFiles([]);
      } finally {
          setIsSubmitting(false);
      }
  };

  const submitComment = async () => {
      if (!selectedRequest || !newComment.trim()) return;
      setIsSubmittingComment(true);
      
      try {
          if (!useMock) {
              const { error: insertErr } = await supabase.from('csl_request_logs').insert([{
                  request_id: selectedRequest.id,
                  status: selectedRequest.status,
                  actor_name: currentUser?.fullName || currentUser?.email || 'User',
                  actor_id: currentUser?.id ? String(currentUser.id) : null,
                  note: newComment.trim(),
                  has_files: false,
              }]);
              if (insertErr) {
                  alert(`Gagal mengirim komentar: ${insertErr.message}`);
                  setIsSubmittingComment(false);
                  return;
              }
              
              // Notify requester about new comment
              if (currentUser?.email !== selectedRequest.requester_email) {
                  await notifyRequestUpdate(selectedRequest, 'STATUS_CHANGED', `Pesan baru dari ${currentUser?.fullName || 'CSL Team'}:\n\n"${newComment.trim()}"`);
              }
              
              // Refresh logs after insert
              const { data: logs } = await supabase
                  .from('csl_request_logs')
                  .select('*')
                  .eq('request_id', selectedRequest.id)
                  .order('created_at', { ascending: true });
              if (logs) setRequestLogs(logs);
          } else {
              // In mock mode, show comment locally
              setRequestLogs(prev => [...prev, {
                  id: Date.now(),
                  request_id: selectedRequest.id,
                  status: selectedRequest.status,
                  actor_name: currentUser?.fullName || 'User',
                  actor_id: currentUser?.id ? String(currentUser.id) : null,
                  note: newComment.trim(),
                  has_files: false,
                  created_at: new Date().toISOString(),
              }]);
          }
          setNewComment('');
      } catch (err: any) {
          alert(`Error tidak terduga: ${err?.message || 'Unknown error'}`);
      } finally {
          setIsSubmittingComment(false);
      }
  };

  const submitDocument = async () => {
      if (!selectedRequest || !docForm.doc_name.trim()) return;
      if (!docForm.gdrive_url.trim() && !docFile) return;
      
      setIsSubmittingDoc(true);
      
      try {
          if (!useMock) {
              let finalGdriveUrl = docForm.gdrive_url.trim();
              let fileId = null;

              if (docFile) {
                // Convert to Base64
                const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.readAsDataURL(file);
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = error => reject(error);
                });

                const base64 = await toBase64(docFile);
                
                // Call edge function
                const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
                  body: {
                    fileName: docFile.name,
                    fileMimeType: docFile.type,
                    fileBase64: base64,
                    requesterEmail: selectedRequest.requester_email,
                    folderType: 'request'
                  }
                });

                if (uploadError || !uploadData?.success) {
                  throw new Error(uploadError?.message || uploadData?.error || 'Gagal upload ke Google Drive');
                }

                finalGdriveUrl = uploadData.gdriveUrl;
                fileId = uploadData.fileId;
              }

              const { error } = await supabase.from('csl_request_documents').insert([{
                  request_id: selectedRequest.id,
                  doc_name: docForm.doc_name.trim(),
                  doc_type: docForm.doc_type || 'Lainnya',
                  gdrive_url: finalGdriveUrl,
                  gdrive_file_id: fileId,
                  uploaded_by_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
                  uploaded_by_id: currentUser?.id ? String(currentUser.id) : null,
                  is_visible_to_requester: true,
              }]);
              
              if (error) {
                  alert(`Gagal menyimpan dokumen: ${error.message}`);
                  setIsSubmittingDoc(false);
                  return;
              }
              
              // Notify requester about new document
              if (currentUser?.email !== selectedRequest.requester_email) {
                  await notifyRequestUpdate(selectedRequest, 'STATUS_CHANGED', `Dokumen baru telah dilampirkan: ${docForm.doc_name.trim()}`);
              }
              
              // Refresh documents
              const { data: docs } = await supabase
                  .from('csl_request_documents')
                  .select('*')
                  .eq('request_id', selectedRequest.id)
                  .order('created_at', { ascending: false });
              if (docs) setRequestDocuments(docs);
              
              // Add log entry for document upload
              await supabase.from('csl_request_logs').insert([{
                  request_id: selectedRequest.id,
                  status: selectedRequest.status, // Keep current status
                  actor_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
                  actor_id: currentUser?.id ? String(currentUser.id) : null,
                  note: `Dokumen ditambahkan: ${docForm.doc_name.trim()}`,
                  has_files: true,
              }]);
              
              // Refresh logs
              const { data: logs } = await supabase
                  .from('csl_request_logs')
                  .select('*')
                  .eq('request_id', selectedRequest.id)
                  .order('created_at', { ascending: true });
              if (logs) setRequestLogs(logs);
          }
          
          setDocForm({ doc_name: '', doc_type: '', gdrive_url: '' });
          setDocFile(null);
          setShowDocForm(false);
      } catch (err: any) {
          alert(`Error tidak terduga: ${err?.message || 'Unknown error'}`);
      } finally {
          setIsSubmittingDoc(false);
      }
  };

  const submitFeedback = async () => {
      if (!selectedRequest) return;
      setIsSubmitting(true);
      
      const payload = {
          feedback_overall_rating: feedbackForm.overall,
          feedback_response_time_rating: feedbackForm.responseTime,
          feedback_service_quality_rating: feedbackForm.quality,
          feedback_comment: feedbackForm.comment,
          feedback_submitted_at: new Date().toISOString()
      };
      
      try {
          if (!useMock) {
              await supabase.from('csl_requests').update(payload).eq('id', selectedRequest.id);
          }
          await fetchData();
          setSelectedRequest(null);
      } finally {
          setIsSubmitting(false);
      }
  };

  if (view === 'categories') return <CategoriesView categories={categories} />;

  const pageTitle = view === 'mine' ? (isCslTeam ? 'Assigned to Me' : 'My Requests') : 'All Requests';
  const pageDesc  = view === 'mine' ? (isCslTeam ? 'Track requests assigned to you for processing' : 'Track your submitted requests and their SLA status') : 'All CSL requests across departments';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <PageHeader title={pageTitle} description={pageDesc}>
        <div className="flex items-center gap-2">
          {useMock && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 uppercase tracking-wider">
              Demo Data
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          {!isCslTeam && (
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9">
               <Plus className="h-4 w-4 mr-1.5" /> Create Request
            </Button>
          )}
        </div>
      </PageHeader>

      {/* SLA Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">On Track</span>
          </div>
          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{slaStats.onTrack}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-amber-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Due Soon</span>
          </div>
          <p className="text-3xl font-black text-amber-700 dark:text-amber-400">{slaStats.dueSoon + slaStats.dueToday}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-700 dark:text-red-400">Overdue</span>
          </div>
          <p className="text-3xl font-black text-red-700 dark:text-red-400">{slaStats.overdue}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={16} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Total</span>
          </div>
          <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{slaStats.total}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-card border border-border/10 rounded-xl p-4">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Search by number, requester, category..."
            className="pl-9 text-sm bg-muted/30 border-none focus-visible:ring-0"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'SUBMITTED', 'IN_REVIEW', 'PROCESSING', 'REVISION_REQUIRED', 'COMPLETED', 'OVERDUE'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border/20 text-muted-foreground hover:border-primary/40'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCcw className="animate-spin" size={28} />
          <p className="text-[10px] font-bold uppercase tracking-widest">Loading requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground/50 text-[10px] font-bold uppercase tracking-widest">
          No requests found.
        </div>
      ) : (
        <div className="bg-card border border-border/10 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/10">
                  {view === 'mine' ? (
                    [...['Request No.', 'Deskripsi', 'Tanggal Request', 'Status', 'SLA Due'], ...(isAdmin ? ['Actions'] : [])].map(h => (
                      <TableHead key={h} className={`text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70 whitespace-nowrap ${h === 'Actions' ? 'text-right' : ''}`}>{h}</TableHead>
                    ))
                  ) : (
                    [...['Request No.', 'Deskripsi', 'Pemohon', 'Dept', 'PIC', 'Status', 'SLA Due', 'SLA Status'], ...(isAdmin ? ['Actions'] : [])].map(h => (
                      <TableHead key={h} className={`text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70 whitespace-nowrap ${h === 'Actions' ? 'text-right' : ''}`}>{h}</TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(req => {
                  const slaStatus = getSlaStatus(req.sla_due_date, req.status, req.completed_at);
                  const slaBadge = SLA_BADGE[slaStatus];
                  const dueDate = new Date(req.sla_due_date).toLocaleDateString('en-GB');
                  const requestDate = new Date(req.created_at).toLocaleDateString('en-GB');

                  if (view === 'mine') {
                    return (
                      <TableRow key={req.id} onClick={() => handleRowClick(req)} className="group border-border/10 hover:bg-muted/30 transition-colors cursor-pointer">
                        <TableCell className="font-mono text-xs font-bold text-primary">{req.request_number}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate font-medium text-foreground">{req.description}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{requestDate}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${STATUS_BADGE[req.status] || ''}`}>
                            {req.status.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{dueDate}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => {
                                e.stopPropagation();
                                setEditForm({
                                  id: req.id,
                                  category_id: req.category_id,
                                  priority: req.priority,
                                  status: req.status,
                                  department: req.department,
                                  assigned_pic_name: req.assigned_pic_name || '',
                                  description: req.description
                                });
                                setIsEditDialogOpen(true);
                              }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRequest(req.id);
                              }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={req.id} onClick={() => handleRowClick(req)} className="group border-border/10 hover:bg-muted/30 transition-colors cursor-pointer">
                      <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">{req.request_number}</TableCell>
                      <TableCell className="text-xs text-foreground max-w-[220px]">
                        <span className="block truncate font-medium" title={req.description}>{req.description}</span>
                        <span className="text-[10px] text-muted-foreground">{requestDate}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{req.requester_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{req.requester_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{req.department}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{req.assigned_pic_name || <span className="italic opacity-40">Unassigned</span>}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap ${STATUS_BADGE[req.status] || ''}`}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{dueDate}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap ${slaBadge.className}`}>
                          {slaBadge.label}
                        </span>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => {
                              e.stopPropagation();
                              setEditForm({
                                id: req.id,
                                category_id: req.category_id,
                                priority: req.priority,
                                status: req.status,
                                department: req.department,
                                assigned_pic_name: req.assigned_pic_name || '',
                                description: req.description
                              });
                              setIsEditDialogOpen(true);
                            }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRequest(req.id);
                            }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-5 py-3 bg-muted/20 border-t border-border/10">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              Showing {filtered.length} of {requests.length} requests
            </p>
          </div>
        </div>
      )}
      
      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-4xl xl:max-w-5xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          {selectedRequest && (() => {
            const sla = getSlaStatus(selectedRequest.sla_due_date, selectedRequest.status, selectedRequest.completed_at);
            const slaBadge = SLA_BADGE[sla];
            
            return (
              <div className="bg-background rounded-xl shadow-xl w-full flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-black text-foreground font-mono">{selectedRequest.request_number}</h2>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${STATUS_BADGE[selectedRequest.status] || ''}`}>
                        {selectedRequest.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Masuk {new Date(selectedRequest.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Body Content */}
                <div className="px-6 py-6 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Identitas & SLA */}
                    <div className="space-y-6">
                      {/* Informasi Pemohon */}
                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Informasi Pemohon</p>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Nama</p>
                            <p className="text-xs font-bold text-foreground">{selectedRequest.requester_name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Email</p>
                            <p className="text-xs font-medium text-foreground truncate">{selectedRequest.requester_email}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Departemen</p>
                            <p className="text-xs font-medium text-foreground">{selectedRequest.department}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Perusahaan</p>
                            <p className="text-xs font-medium text-foreground">{selectedRequest.company}</p>
                          </div>
                        </div>
                      </div>

                      {/* SLA Info */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-card border border-border rounded-xl p-3 text-center">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">SLA Target</p>
                          <p className="text-lg font-black text-foreground">{selectedRequest.sla_target_days}d</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-3 text-center">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">SLA Due</p>
                          <p className="text-xs font-black text-foreground">
                            {new Date(selectedRequest.sla_due_date).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                          </p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${slaBadge.className}`}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-70">SLA</p>
                          <p className="text-xs font-black">{slaBadge.label}</p>
                        </div>
                      </div>
                      
                      {/* PIC */}
                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PIC Assigned</p>
                        </div>
                        <div className="p-4">
                          <p className="text-xs font-bold text-foreground">
                            {selectedRequest.assigned_pic_name || <span className="text-muted-foreground italic font-normal">Belum di-assign</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Deskripsi, Tujuan, Required Date */}
                    <div className="space-y-6">
                      {/* Tanggal dibutuhkan */}
                      {selectedRequest.required_date && (
                        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-3">
                          <Clock size={15} className="text-amber-600 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">Dibutuhkan Paling Lambat</p>
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                              {new Date(selectedRequest.required_date).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Deskripsi */}
                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deskripsi Permintaan</p>
                        </div>
                        <div className="p-4 max-h-40 overflow-y-auto">
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{selectedRequest.description}</p>
                        </div>
                      </div>

                      {/* Tujuan */}
                      {(selectedRequest as any).tujuan && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                          <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tujuan Permintaan</p>
                          </div>
                          <div className="p-4 max-h-40 overflow-y-auto">
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{(selectedRequest as any).tujuan}</p>
                          </div>
                        </div>
                      )}

                      {/* Dokumen Lampiran (Combined Old & GDrive) */}
                      {(() => {
                        const oldAttachments: string[] = (() => {
                          try { return JSON.parse((selectedRequest as any).attachments || '[]'); } catch { return []; }
                        })();
                        const hasDocuments = oldAttachments.length > 0 || requestDocuments.length > 0;
                        if (!hasDocuments && !isCslTeam) return null;
                        
                        return (
                          <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex justify-between items-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                {(() => {
                                  const responseFiles = (() => { try { return JSON.parse((selectedRequest as any).csl_response_files || '[]'); } catch { return []; } })();
                                  const totalCount = oldAttachments.length + requestDocuments.length + responseFiles.length;
                                  return <><FolderOpen size={12} /> Dokumen Lampiran ({totalCount})</>;
                                })()}
                              </p>
                              {isCslTeam && !['COMPLETED', 'CLOSED'].includes(selectedRequest.status) && (
                                <button 
                                  onClick={() => setShowDocForm(!showDocForm)}
                                  className="text-[10px] font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                >
                                  {showDocForm ? 'Batal' : '+ Tambah Dokumen'}
                                </button>
                              )}
                            </div>
                            
                            <div className="p-3 space-y-1.5">
                              {/* Old Attachments */}
                              {oldAttachments.map((url, i) => {
                                const name = decodeURIComponent(url.split('/').pop()?.split('_').slice(1).join('_') || `File ${i + 1}`);
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
                                return (
                                  <a key={`old-${i}`} href={url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/60 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-200 transition-colors group">
                                    <Paperclip size={12} className="text-blue-500 shrink-0" />
                                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-blue-600 min-w-0">{name}</span>
                                    {isImage && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">Gambar</span>}
                                  </a>
                                );
                              })}
                              
                              {/* GDrive & Response Documents */}
                              {requestDocuments.map((doc, i) => (
                                <div key={`gdrive-${i}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/60 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-200 transition-colors group">
                                  <a href={doc.doc_url || (doc as any).gdrive_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                      <Link size={10} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-xs font-bold text-foreground truncate group-hover:text-blue-600">{doc.doc_name}</span>
                                  </a>
                                  <div className="flex items-center gap-2 ml-2 shrink-0">
                                      {doc.doc_type && <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{doc.doc_type}</span>}
                                      <span className="text-[10px] text-muted-foreground hidden sm:inline">Oleh {doc.uploaded_by_name?.split(' ')[0] || 'Pemohon'}</span>
                                  </div>
                                </div>
                              ))}

                              {/* Response Files (csl_response_files) */}
                              {(() => {
                                const responseFiles: any[] = (() => {
                                  try { return JSON.parse((selectedRequest as any).csl_response_files || '[]'); } catch { return []; }
                                })();
                                return responseFiles.map((f, i) => (
                                  <div key={`resp-${i}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors group">
                                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className="w-6 h-6 rounded-md bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 shadow-sm border border-slate-200 dark:border-zinc-700">
                                        <Link size={10} className="text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate group-hover:text-blue-800">{f.name || 'Lampiran Tim CSL'}</span>
                                    </a>
                                    <div className="flex items-center gap-2 ml-2 shrink-0">
                                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-200 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300">Respon CSL</span>
                                    </div>
                                  </div>
                                ));
                              })()}
                              
                              {!hasDocuments && <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada dokumen lampiran.</p>}
                            </div>

                            {/* Add Document Form (Moved here from bottom) */}
                            {showDocForm && (
                              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 border-t border-border space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Nama Dokumen *</label>
                                    <input type="text" placeholder="Cth: Surat Kuasa Final" value={docForm.doc_name} onChange={e => setDocForm({...docForm, doc_name: e.target.value})} className="w-full mt-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Jenis</label>
                                    <input type="text" placeholder="Cth: Akta, Draft" value={docForm.doc_type} onChange={e => setDocForm({...docForm, doc_type: e.target.value})} className="w-full mt-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </div>
                                </div>
                                <div className="pt-2">
                                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Upload File (Otomatis ke GDrive)</label>
                                  <div className="flex flex-col gap-2">
                                    <input type="file" ref={docFileRef} className="hidden" onChange={e => { if (e.target.files && e.target.files.length > 0) { setDocFile(e.target.files[0]); setDocForm({...docForm, gdrive_url: ''}); } }} />
                                    <div onClick={() => docFileRef.current?.click()} className="flex items-center gap-2 border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/10 px-4 py-3 rounded-xl cursor-pointer transition-colors">
                                      <Upload size={14} className="text-blue-500" />
                                      <div className="flex-1 min-w-0">
                                        {docFile ? <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate block">{docFile.name}</span> : <span className="text-xs font-medium text-blue-600/70">Klik untuk pilih file...</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 my-1">
                                      <div className="flex-1 h-px bg-border/60"></div><span className="text-[9px] font-black uppercase text-muted-foreground">ATAU</span><div className="flex-1 h-px bg-border/60"></div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Link Google Drive (Manual)</label>
                                      <input type="url" placeholder="https://drive.google.com/..." value={docForm.gdrive_url} onChange={e => { setDocForm({...docForm, gdrive_url: e.target.value}); if (e.target.value) setDocFile(null); }} className="w-full mt-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end pt-3">
                                  <Button size="sm" onClick={submitDocument} disabled={isSubmittingDoc || !docForm.doc_name.trim() || (!docForm.gdrive_url.trim() && !docFile)} className="bg-blue-600 hover:bg-blue-500 text-xs h-8">{isSubmittingDoc ? 'Menyimpan...' : 'Simpan Dokumen'}</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Activity Log / Timeline */}
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Log Proses</p>
                    </div>
                    <div className="p-4">
                      {(() => {
                        // Gunakan data dari DB jika ada, fallback ke derived jika DB kosong
                        const fallbackEvents: { date: string; status: string; actor: string; note?: string; hasFiles?: boolean }[] = 
                          requestLogs.length === 0
                            ? [{ date: selectedRequest.created_at, status: 'SUBMITTED', actor: selectedRequest.requester_name, note: 'Permintaan diajukan' }]
                            : [];
                        const allEvents = [
                          ...fallbackEvents,
                          ...requestLogs.map((l: any) => ({
                            date: l.created_at,
                            status: l.status,
                            actor: l.actor_name,
                            note: l.note,
                            hasFiles: l.has_files,
                          }))
                        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                        const dotColor: Record<string, string> = {
                          SUBMITTED:         'bg-blue-500',
                          ACKNOWLEDGED:      'bg-sky-500',
                          IN_REVIEW:         'bg-violet-500',
                          PROCESSING:        'bg-amber-500',
                          REVISION_REQUIRED: 'bg-orange-500',
                          COMPLETED:         'bg-emerald-500',
                          REJECTED:          'bg-red-500',
                          CLOSED:            'bg-slate-400',
                        };

                        return (
                          <div className="relative pt-2">
                            <div className="space-y-0">
                              {allEvents.map((evt, i) => {
                                const isSystemNote = evt.note && (
                                  evt.note.includes('Permintaan diajukan') || 
                                  evt.note.includes('Dokumen ditambahkan:') || 
                                  evt.note.includes('Status diubah')
                                );
                                const isFinal = i === allEvents.length - 1;

                                return (
                                <div key={i} className="relative flex gap-4 pl-1 group">
                                  {/* Timeline Line */}
                                  {!isFinal && <div className="absolute left-[15px] top-6 bottom-[-24px] w-[2px] bg-border/50 group-hover:bg-primary/30 transition-colors z-0" />}
                                  
                                  {/* Timeline Dot */}
                                  <div className={`relative z-10 w-7 h-7 rounded-full shrink-0 mt-0.5 flex items-center justify-center border-[3px] border-background shadow-sm ${dotColor[evt.status] || 'bg-muted'}`}>
                                      {isSystemNote ? (
                                          <div className="w-1.5 h-1.5 rounded-full bg-background" />
                                      ) : (
                                          <MessageSquare size={10} className="text-background fill-background/20" />
                                      )}
                                  </div>

                                  <div className="flex-1 min-w-0 pb-7">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <p className="text-xs font-bold text-foreground">{evt.actor}</p>
                                      <span className="text-[10px] text-muted-foreground/50">•</span>
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        {new Date(evt.date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                                      </span>
                                      {evt.status && (
                                        <span className={`ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${STATUS_BADGE[evt.status] || 'bg-muted text-muted-foreground'}`}>
                                          {evt.status.replace(/_/g, ' ')}
                                        </span>
                                      )}
                                    </div>

                                    {evt.note && (
                                      isSystemNote ? (
                                        <div className="flex items-start gap-1.5 mt-1">
                                          {evt.note.includes('Dokumen') ? (
                                            <FileText size={12} className="text-blue-500 mt-0.5 shrink-0"/>
                                          ) : (
                                            <Activity size={12} className="text-muted-foreground/50 mt-0.5 shrink-0"/>
                                          )}
                                          <p className="text-xs text-muted-foreground/80 italic font-medium leading-relaxed">
                                            {evt.note}
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="mt-1.5 px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-muted/40 dark:bg-muted/20 text-[13px] text-foreground/90 border border-border/40 inline-block shadow-sm leading-relaxed">
                                          {evt.note}
                                        </div>
                                      )
                                    )}

                                    {(() => {
                                      if (!evt.hasFiles || isSystemNote) return null;
                                      
                                      const allFiles = (() => {
                                        try { return JSON.parse((selectedRequest as any).csl_response_files || '[]'); } catch { return []; }
                                      })();
                                      
                                      const logTime = new Date(evt.date).getTime();
                                      const eventFiles = allFiles.filter((f: any) => {
                                        const fileTime = new Date(f.added_at).getTime();
                                        // Match if file was added within 5 minutes before this log
                                        return fileTime <= logTime && (logTime - fileTime) < 300000;
                                      });

                                      if (eventFiles.length === 0) {
                                        return (
                                          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/30 text-[10px] font-bold shadow-sm cursor-not-allowed" title="File mungkin sudah tidak tersedia">
                                            <Paperclip size={12} />
                                            <span>Terdapat Lampiran</span>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                          {eventFiles.map((f: any, idx: number) => (
                                            <a key={idx} href={f.url} target="_blank" rel="noopener noreferrer" 
                                               className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/30 text-[10px] font-bold shadow-sm transition-colors cursor-pointer">
                                              <Paperclip size={12} />
                                              <span className="truncate max-w-[150px]">{f.name || 'Lampiran'}</span>
                                            </a>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Comment Input */}
                    {!['CLOSED', 'COMPLETED', 'REJECTED'].includes(selectedRequest.status) && (
                      <div className="bg-white dark:bg-card border-t-2 border-border px-4 py-3 z-10 relative">
                        <div className="flex gap-2.5 items-end">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 mb-0.5 shadow ring-2 ring-background">
                            <span className="text-[11px] font-extrabold text-white tracking-wide">
                              {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>

                          {/* Input Wrapper */}
                          <div className="flex-1 flex items-end gap-2.5 transition-all duration-200">
                            <textarea
                              rows={1}
                              placeholder="Ketik pesan atau update..."
                              value={newComment}
                              onChange={(e) => {
                                setNewComment(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  submitComment();
                                }
                              }}
                              style={{ minHeight: '42px', maxHeight: '120px' }}
                              className="flex-1 text-[13px] bg-muted/30 border border-border/60 focus:border-blue-400 focus:bg-white dark:focus:bg-card focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-4 py-3 outline-none resize-none text-foreground placeholder:text-muted-foreground/50 transition-all shadow-sm leading-relaxed"
                            />
                            <Button
                              size="icon"
                              disabled={isSubmittingComment || !newComment.trim()}
                              onClick={submitComment}
                              className={`h-10 w-10 rounded-full shrink-0 transition-all duration-300 mb-[1px] flex items-center justify-center ${
                                newComment.trim()
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:scale-105'
                                  : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                              }`}
                            >
                              {isSubmittingComment
                                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                : <Send size={16} className="-ml-0.5 mt-0.5" />
                              }
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground/40 text-right mt-1.5 pr-1">Enter untuk kirim · Shift+Enter baris baru</p>
                      </div>
                    )}
                  </div>

                  {/* CSL Response Display */}
                  {selectedRequest.csl_response && (
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={14} className="text-primary" />
                        <h4 className="text-xs font-bold uppercase text-primary">Balasan CSL</h4>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{selectedRequest.csl_response}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Dijawab pada {new Date(selectedRequest.csl_response_at!).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
                      </p>
                    </div>
                  )}

                  {/* Feedback Display */}
                  {selectedRequest.feedback_submitted_at && (
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Star size={14} className="text-amber-500" />
                        <h4 className="text-xs font-bold uppercase text-amber-700 dark:text-amber-500">Feedback Pemohon</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { label: 'Overall', val: selectedRequest.feedback_overall_rating },
                          { label: 'Kecepatan', val: selectedRequest.feedback_response_time_rating },
                          { label: 'Kualitas', val: selectedRequest.feedback_service_quality_rating },
                        ].map(f => (
                          <div key={f.label} className="text-center p-2 bg-background rounded-lg border border-border/10">
                            <p className="text-[10px] uppercase text-muted-foreground mb-1">{f.label}</p>
                            <p className="font-black text-amber-600 text-sm">{f.val}/5</p>
                          </div>
                        ))}
                      </div>
                      {selectedRequest.feedback_comment && (
                        <p className="text-xs italic text-muted-foreground">"{selectedRequest.feedback_comment}"</p>
                      )}
                    </div>
                  )}

                  {/* CSL Action Form */}
                  {isCslTeam && !['COMPLETED', 'CLOSED'].includes(selectedRequest.status) && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-border">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Update Status Request</p>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Status */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-muted-foreground">Status Baru</label>
                          <select 
                            className="w-full mt-1.5 px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            value={responseForm.status}
                            onChange={e => setResponseForm({...responseForm, status: e.target.value})}
                          >
                            <option value="">— Pilih Status —</option>
                            <option value="ACKNOWLEDGED">Acknowledged</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="REVISION_REQUIRED">Revision Required</option>
                            <option value="COMPLETED">Completed ✓</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>

                        {/* Catatan */}
                        {['COMPLETED', 'REJECTED', 'REVISION_REQUIRED', 'RESPONDED'].includes(responseForm.status) && (
                          <div>
                            <label className="text-[10px] font-black uppercase text-muted-foreground">Catatan / Balasan</label>
                            <textarea 
                              rows={3}
                              className="w-full mt-1.5 px-3 py-2 text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              placeholder="Tulis catatan atau balasan untuk pemohon..."
                              value={responseForm.response}
                              onChange={e => setResponseForm({...responseForm, response: e.target.value})}
                            />
                          </div>
                        )}

                        {/* Divider Dokumen Fisik */}
                        <div className="border-t border-border/60 pt-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Lampirkan File Fisik (Opsional)</p>

                          {/* File Upload */}
                          <div>
                            <div
                              onClick={() => responseFileRef.current?.click()}
                              onDragOver={e => { e.preventDefault(); setIsDraggingResponse(true); }}
                              onDragLeave={() => setIsDraggingResponse(false)}
                              onDrop={e => {
                                e.preventDefault(); setIsDraggingResponse(false);
                                const files = Array.from(e.dataTransfer.files);
                                setResponseFiles(prev => {
                                  const names = new Set(prev.map(f => f.name));
                                  return [...prev, ...files.filter(f => !names.has(f.name))];
                                });
                              }}
                              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                                isDraggingResponse ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' : 'border-border hover:border-blue-300 hover:bg-muted/20'
                              }`}
                            >
                              <Paperclip size={18} className="text-blue-400" />
                              <p className="text-xs font-bold text-blue-600">Klik atau seret file ke sini</p>
                              <p className="text-[10px] text-muted-foreground">PDF, DOCX, XLSX, JPG, PNG — maks. 10MB</p>
                              <input ref={responseFileRef} type="file" multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={e => {
                                  const files = Array.from(e.target.files || []);
                                  setResponseFiles(prev => {
                                    const names = new Set(prev.map(f => f.name));
                                    return [...prev, ...files.filter(f => !names.has(f.name))];
                                  });
                                }}
                              />
                            </div>
                            {responseFiles.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {responseFiles.map(file => (
                                  <div key={file.name} className="flex items-center justify-between bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Paperclip size={11} className="text-blue-500 shrink-0" />
                                      <span className="text-xs font-semibold text-foreground truncate">{file.name}</span>
                                    </div>
                                    <button type="button" onClick={() => setResponseFiles(prev => prev.filter(f => f.name !== file.name))}
                                      className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors shrink-0 ml-1">
                                      <X size={11} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Existing response files preview */}
                          {(() => {
                            const existing: any[] = (() => {
                              try { return JSON.parse((selectedRequest as any).csl_response_files || '[]'); } catch { return []; }
                            })();
                            if (!existing.length) return null;
                            return (
                              <div className="mt-3">
                                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1.5">Dokumen Sebelumnya</p>
                                <div className="space-y-1.5">
                                  {existing.map((item: any, i: number) => (
                                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/60 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors group">
                                      {item.type === 'gdrive'
                                        ? <Link size={11} className="text-blue-500 shrink-0" />
                                        : <Paperclip size={11} className="text-blue-500 shrink-0" />}
                                      <span className="text-xs font-semibold truncate group-hover:text-blue-600">{item.name}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <Button onClick={submitResponse} disabled={isSubmitting || !responseForm.status} className="w-full h-10 bg-blue-600 hover:bg-blue-500 font-bold text-sm">
                          <Send size={14} className="mr-2" /> Simpan Update
                        </Button>
                      </div>
                    </div>
                  )}



                  {/* Feedback Form (Requester) */}
                  {!isCslTeam && ['COMPLETED', 'CLOSED'].includes(selectedRequest.status) && !selectedRequest.feedback_submitted_at && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800/40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Beri Feedback</p>
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground">Bagaimana performa tim CSL untuk permintaan ini?</p>
                        {[
                          { key: 'overall', label: 'Overall' },
                          { key: 'responseTime', label: 'Kecepatan Respon' },
                          { key: 'quality', label: 'Kualitas Layanan' }
                        ].map(field => (
                          <div key={field.key} className="flex items-center justify-between">
                            <span className="text-xs font-semibold">{field.label}</span>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(rating => (
                                <button key={rating} onClick={() => setFeedbackForm({...feedbackForm, [field.key]: rating})} className="p-0.5 hover:scale-110 transition-transform">
                                  <Star size={18} className={rating <= (feedbackForm as any)[field.key] ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <textarea rows={2} className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-xl resize-none" placeholder="Komentar tambahan (opsional)..." value={feedbackForm.comment} onChange={e => setFeedbackForm({...feedbackForm, comment: e.target.value})} />
                        <Button onClick={submitFeedback} disabled={isSubmitting} variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100">
                          Kirim Feedback
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-4xl xl:max-w-5xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          <div className="bg-background rounded-xl shadow-xl w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-xl font-black text-foreground">Buat Permintaan Baru</h2>
              </div>
            </div>
            <div className="px-6 py-6 max-h-[85vh] overflow-y-auto">
              <CSLCreateRequest 
                currentUser={currentUser} 
                onClose={() => setIsCreateOpen(false)} 
                onSuccess={() => {
                  fetchData();
                  // No need to close immediately if they want to 'Buat Permintaan Lain', but if they click 'Tutup' the child closes it
                }} 
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog for Admin */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl font-black">Ubah Status Request</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Khusus Admin: Koreksi status secara paksa.</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Status</label>
              <select 
                className="w-full text-sm border border-border bg-background rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={editForm.status || ''}
                onChange={e => setEditForm({...editForm, status: e.target.value})}
              >
                {Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-muted/10 gap-2 flex sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)} className="text-xs font-bold rounded-xl h-9">
              Batal
            </Button>
            <Button size="sm" onClick={handleEditSave} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={requestToDelete !== null} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Request Permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Request beserta seluruh data dokumen dan percakapan yang terkait akan dihapus secara permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
