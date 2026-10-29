import React, { useState, useMemo, useEffect } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Layers,
  Search,
  Plus,
  Download,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Building2,
  Trash2,
  Pencil,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { formatCslDate } from '../utils/cslStatusHelper';

export interface AdMgtRecord {
  id: string;
  companyName: string;
  agenda: string;
  status: 'Not started' | 'In progress' | 'Completed' | 'Blocked';
  startDate: string; // ISO 'YYYY-MM-DD'
  completeDate: string; // ISO 'YYYY-MM-DD'
  notes?: string;
}

const DEFAULT_COMPANIES = [
  'Alakasa Alumina Refineri',
  'Alakasa Extrusindo',
  'Alakasa Industrindo Tbk',
  'Alka Niaga Industri',
  'Arjuna Bumi Cahaya',
  'Bahana Cipta Permai',
  'Bumi Grafika Jaya',
  'Catur Boga Pratama',
  'DA International',
  'Dharma Alumas Sakti',
  'Gesit Alumas',
  'Gesit Bumi Persada',
  'Gesit Graha',
  'Gesit Intrade',
  'Gesit Makmur Utama',
  'Gesit Maju',
  'Gesit Perkasa',
  'HTT Sarana Perkasa',
  'Jaya Mitra Investasi',
  'Jaya Sejahtera Investasi',
  'Jaya Sudirman Mandiri',
  'Jaya Sudirman Perkasa',
  'JSAlu Investasi Pratama',
  'JSGlobal Mineral Energi',
  'JSCapital Investasi Gesit',
  'JSGlobal Energi Pratama',
  'JSGlobal Logistik Energi',
  'Kalimantan Industri Terpadu',
  'Lima Garda Sakti',
  'Lima Sudirman Perkasa',
  'Mitra Harapan Karya Utama',
  'Mitra Harapan Sakti',
  'Mitra Senayan Sejati',
  'Mitra Sudirman Lestari',
  'Mitra Sudirman Mandiri',
  'Prodas Perdana',
  'Sembilan Empat Investama',
];

const INITIAL_ADMGT_DATA: AdMgtRecord[] = [
  {
    id: 'ad-01',
    companyName: 'Gesit Alumas',
    agenda: 'Perubahan Susunan Direksi & Pengangkatan Komisaris Utama',
    status: 'Completed',
    startDate: '2026-05-12',
    completeDate: '2026-05-27',
    notes: 'Pemberitahuan perubahan data perseroan telah diterima dan didokumentasikan.',
  },
  {
    id: 'ad-02',
    companyName: 'Dharma Alumas Sakti',
    agenda: 'Peningkatan Modal Ditempatkan dan Disetor Penuh',
    status: 'Completed',
    startDate: '2026-06-02',
    completeDate: '2026-06-18',
    notes: 'Bukti setor modal dari bank rekanan lengkap terlampir dalam minuta notaris.',
  },
  {
    id: 'ad-03',
    companyName: 'Alakasa Extrusindo',
    agenda: 'Penyesuaian Maksud dan Tujuan Perseroan (KBLI 2020)',
    status: 'In progress',
    startDate: '2026-07-15',
    completeDate: '',
    notes: 'Minuta akta telah ditandatangani; permohonan persetujuan sedang diproses notaris.',
  },
  {
    id: 'ad-04',
    companyName: 'Mitra Sudirman Lestari',
    agenda: 'Perubahan Alamat Domisili Kantor Pusat Perseroan',
    status: 'In progress',
    startDate: '2026-08-01',
    completeDate: '',
    notes: 'Draft akta sirkuler sedang diparaf oleh seluruh pemegang saham.',
  },
  {
    id: 'ad-05',
    companyName: 'Prodas Perdana',
    agenda: 'Pengangkatan Kembali Direksi & Dewan Komisaris (Re-appointment)',
    status: 'Completed',
    startDate: '2026-04-10',
    completeDate: '2026-04-25',
    notes: 'Masa jabatan diperpanjang untuk periode 3 tahun ke depan sesuai anggaran dasar.',
  },
  {
    id: 'ad-06',
    companyName: 'Jaya Sudirman Mandiri',
    agenda: 'Rencana Pengurangan Modal Dasar Perseroan',
    status: 'Not started',
    startDate: '2026-09-01',
    completeDate: '',
    notes: 'Pengumuman di surat kabar harian nasional sedang disiapkan sesuai ketentuan UUPT.',
  },
];

const STORAGE_KEY = 'csl_admgt_changes_v2';

export const CSLAdMgtTracker: React.FC<{ currentUser?: UserAccount | null }> = () => {
  const [data, setData] = useState<AdMgtRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_ADMGT_DATA;
  });

  const [companyOptions, setCompanyOptions] = useState<string[]>(DEFAULT_COMPANIES);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCompany, setFormCompany] = useState('');
  const [formAgenda, setFormAgenda] = useState('');
  const [formStatus, setFormStatus] = useState<AdMgtRecord['status']>('In progress');
  const [formStartDate, setFormStartDate] = useState('');
  const [formCompleteDate, setFormCompleteDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Fetch Companies from master 'companies'
  const fetchCompanies = async () => {
    try {
      const { data: dbComps, error } = await supabase
        .from('companies')
        .select('name')
        .order('name', { ascending: true });

      if (!error && dbComps && dbComps.length > 0) {
        const names = Array.from(new Set(dbComps.map((c: any) => c.name?.trim()).filter(Boolean)));
        if (names.length > 0) {
          setCompanyOptions(names);
          return;
        }
      }
    } catch (err) {
      console.warn('Fetch companies from db error:', err);
    }
    setCompanyOptions(DEFAULT_COMPANIES);
  };

  // Sync Supabase records if table exists
  const fetchRecords = async () => {
    try {
      const { data: dbRecords, error } = await supabase
        .from('csl_admgt_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbRecords && dbRecords.length > 0) {
        const mapped: AdMgtRecord[] = dbRecords.map((r: any) => ({
          id: String(r.id),
          companyName: r.company_name || r.company || '',
          agenda: r.agenda || '',
          status: r.status || 'Not started',
          startDate: r.start_date || '',
          completeDate: r.complete_date || '',
          notes: r.notes || '',
        }));
        setData(mapped);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      }
    } catch (err) {
      console.warn('Fetch admgt records fallback:', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchRecords();
  }, []);

  const persistData = async (newList: AdMgtRecord[]) => {
    setData(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.companyName.toLowerCase().includes(query) ||
        item.agenda.toLowerCase().includes(query) ||
        (item.notes || '').toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [data, selectedStatus, searchQuery]);

  // Analytics KPI
  const kpis = useMemo(() => {
    const total = data.length;
    const completed = data.filter((i) => i.status === 'Completed').length;
    const inProgress = data.filter((i) => i.status === 'In progress').length;
    const notStarted = data.filter((i) => i.status === 'Not started').length;
    const blocked = data.filter((i) => i.status === 'Blocked').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, notStarted, blocked, pct };
  }, [data]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormCompany(companyOptions[0] || '');
    setFormAgenda('');
    setFormStatus('In progress');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormCompleteDate('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AdMgtRecord) => {
    setEditingId(item.id);
    setFormCompany(item.companyName);
    setFormAgenda(item.agenda);
    setFormStatus(item.status);
    setFormStartDate(item.startDate || '');
    setFormCompleteDate(item.completeDate || '');
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, companyName: string) => {
    const confirmed = window.confirm(`Hapus agenda perubahan AD untuk "${companyName}"?`);
    if (confirmed) {
      const nextList = data.filter((d) => d.id !== id);
      persistData(nextList);
      toast.success('Agenda perubahan AD berhasil dihapus.');

      // Also attempt delete from Supabase if table exists
      try {
        await supabase.from('csl_admgt_records').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete admgt warning:', e);
      }
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim()) {
      toast.error('Pilih Company Name terlebih dahulu!');
      return;
    }
    if (!formAgenda.trim()) {
      toast.error('Agenda perubahan AD wajib diisi!');
      return;
    }

    if (editingId) {
      // Edit existing
      const updatedList = data.map((d) =>
        d.id === editingId
          ? {
              ...d,
              companyName: formCompany.trim(),
              agenda: formAgenda.trim(),
              status: formStatus,
              startDate: formStartDate || '',
              completeDate: formCompleteDate || '',
              notes: formNotes.trim(),
            }
          : d
      );
      persistData(updatedList);
      toast.success(`Perubahan AD "${formCompany}" berhasil diperbarui!`);

      // Try update Supabase
      try {
        await supabase.from('csl_admgt_records').update({
          company_name: formCompany.trim(),
          agenda: formAgenda.trim(),
          status: formStatus,
          start_date: formStartDate || null,
          complete_date: formCompleteDate || null,
          notes: formNotes.trim(),
        }).eq('id', editingId);
      } catch (e) {
        console.warn('Supabase update admgt warning:', e);
      }
    } else {
      // Create new
      const newRecord: AdMgtRecord = {
        id: 'ad-' + Date.now(),
        companyName: formCompany.trim(),
        agenda: formAgenda.trim(),
        status: formStatus,
        startDate: formStartDate || '',
        completeDate: formCompleteDate || '',
        notes: formNotes.trim(),
      };

      const nextList = [newRecord, ...data];
      persistData(nextList);
      toast.success(`Perubahan AD "${newRecord.companyName}" berhasil dicatat!`);

      // Try insert Supabase
      try {
        await supabase.from('csl_admgt_records').insert([{
          company_name: newRecord.companyName,
          agenda: newRecord.agenda,
          status: newRecord.status,
          start_date: newRecord.startDate || null,
          complete_date: newRecord.completeDate || null,
          notes: newRecord.notes,
        }]);
      } catch (e) {
        console.warn('Supabase insert admgt warning:', e);
      }
    }

    setIsModalOpen(false);
  };

  const handleExport = () => {
    const exportData = filteredData.map((d, idx) => ({
      No: idx + 1,
      'Company Name': d.companyName,
      Agenda: d.agenda,
      Status: d.status,
      'Start Date': d.startDate ? formatCslDate(d.startDate) : '-',
      'Complete Date': d.completeDate ? formatCslDate(d.completeDate) : '-',
      Notes: d.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AD_Management_Changes');
    XLSX.writeFile(wb, 'CSL_AD_Management_Changes.xlsx');
    toast.success('Data AD - Management Changes berhasil diekspor ke Excel');
  };

  const getStatusBadge = (status: AdMgtRecord['status']) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            Completed
          </span>
        );
      case 'In progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
            <span className="size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            In progress
          </span>
        );
      case 'Not started':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <span className="size-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
            Not started
          </span>
        );
      case 'Blocked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
            <span className="size-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
            Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans animate-in fade-in duration-500">
      {/* 1. Header Bar */}
      <PageHeader
        title="AD - Management Changes"
        subtitle="ROUTINE ACTIVITY · MANAGEMENT & ARTIKEL PERUBAHAN"
        description="Monitoring dan pencatatan perubahan Anggaran Dasar dan susunan manajemen entitas Grup Gesit"
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-border bg-card text-foreground hover:bg-muted shadow-2xs gap-1.5"
          >
            <Download className="size-3.5 text-muted-foreground" />
            Ekspor
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-[#0a2540] hover:bg-[#16375c] text-white shadow-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            + Tambah Perubahan AD
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchCompanies();
              fetchRecords();
              toast.success('Data disinkronkan dari database');
            }}
            title="Segarkan data"
            className="h-9 w-9 p-0 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted shadow-2xs"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </PageHeader>

      {/* 2. Interactive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelectedStatus('all')}
          className={`p-4 rounded-xl bg-card border shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99] select-none ${
            selectedStatus === 'all'
              ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
              : 'border-border/60 hover:bg-muted/30'
          }`}
          title="Klik untuk melihat seluruh data"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Changes</span>
            <div className="flex items-center gap-1.5">
              {selectedStatus === 'all' && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  Aktif
                </span>
              )}
              <Layers className="size-4 text-blue-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{kpis.total}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center justify-between">
              <span>Seluruh Agenda AD</span>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">Semua Data</span>
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelectedStatus(selectedStatus === 'Completed' ? 'all' : 'Completed')}
          className={`p-4 rounded-xl bg-card border shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99] select-none ${
            selectedStatus === 'Completed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-50/30 dark:bg-emerald-950/30'
              : 'border-border/60 hover:bg-muted/30'
          }`}
          title="Klik untuk memfilter status Completed"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <div className="flex items-center gap-1.5">
              {selectedStatus === 'Completed' && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  Aktif
                </span>
              )}
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {kpis.pct}%
              </span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.completed}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center justify-between">
              <span>Telah Selesai</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                {selectedStatus === 'Completed' ? 'Reset filter' : 'Filter →'}
              </span>
            </div>
          </div>
        </div>

        {/* In Progress Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelectedStatus(selectedStatus === 'In progress' ? 'all' : 'In progress')}
          className={`p-4 rounded-xl bg-card border shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99] select-none ${
            selectedStatus === 'In progress'
              ? 'border-blue-500 ring-2 ring-blue-500/25 bg-blue-50/30 dark:bg-blue-950/30'
              : 'border-border/60 hover:bg-muted/30'
          }`}
          title="Klik untuk memfilter status In progress"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <div className="flex items-center gap-1.5">
              {selectedStatus === 'In progress' && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Aktif
                </span>
              )}
              <Clock className="size-4 text-blue-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{kpis.inProgress}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center justify-between">
              <span>Sedang Berjalan</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                {selectedStatus === 'In progress' ? 'Reset filter' : 'Filter →'}
              </span>
            </div>
          </div>
        </div>

        {/* Not Started / Blocked Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            const next = selectedStatus === 'Not started' ? 'all' : 'Not started';
            setSelectedStatus(next);
          }}
          className={`p-4 rounded-xl bg-card border shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99] select-none ${
            selectedStatus === 'Not started' || selectedStatus === 'Blocked'
              ? 'border-amber-500 ring-2 ring-amber-500/25 bg-amber-50/30 dark:bg-amber-950/30'
              : 'border-border/60 hover:bg-muted/30'
          }`}
          title="Klik untuk memfilter status Not started"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Perlu Tindak Lanjut</span>
            <div className="flex items-center gap-1.5">
              {selectedStatus === 'Not started' && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Aktif
                </span>
              )}
              <AlertTriangle className={`size-4 ${kpis.blocked > 0 ? 'text-rose-500' : 'text-amber-500'}`} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-foreground flex items-baseline gap-2">
              <span className="text-amber-600 dark:text-amber-400">{kpis.notStarted} <span className="text-xs font-semibold">Belum Mulai</span></span>
              {kpis.blocked > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">/</span>
                  <span className="text-rose-600 dark:text-rose-400 text-sm font-bold">{kpis.blocked} Blocked</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5 flex items-center justify-between">
              <span>Menunggu Proses</span>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                {selectedStatus === 'Not started' ? 'Reset filter' : 'Filter →'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Table Container */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20">
          {/* Status chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'Completed', label: 'Completed' },
              { id: 'In progress', label: 'In progress' },
              { id: 'Not started', label: 'Not started' },
              { id: 'Blocked', label: 'Blocked' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedStatus(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === chip.id
                    ? 'bg-[#0a2540] text-white shadow-2xs'
                    : 'bg-background border border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari perusahaan, agenda, catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-background border-border/70 rounded-xl focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/10"
            />
          </div>
        </div>

        {/* Data Table: 6 Required Columns only */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Company Name</th>
                <th className="py-3 px-4 min-w-[240px]">Agenda</th>
                <th className="py-3 px-4 w-[130px]">Status</th>
                <th className="py-3 px-4 w-[130px]">Start Date</th>
                <th className="py-3 px-4 w-[130px]">Complete Date</th>
                <th className="py-3 px-4 min-w-[200px]">Notes</th>
                <th className="py-3 px-3 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground font-medium">
                    Tidak ada agenda perubahan AD yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-muted-foreground tabular-nums">
                      {idx + 1}
                    </td>

                    {/* 1. Company Name */}
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{item.companyName}</span>
                      </div>
                    </td>

                    {/* 2. Agenda */}
                    <td className="py-3.5 px-4 font-medium text-foreground leading-relaxed">
                      {item.agenda}
                    </td>

                    {/* 3. Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* 4. Start Date */}
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {item.startDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3 text-muted-foreground/70 shrink-0" />
                          <span>{formatCslDate(item.startDate)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* 5. Complete Date */}
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {item.completeDate ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                          <span>{formatCslDate(item.completeDate)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* 6. Notes */}
                    <td className="py-3.5 px-4 text-muted-foreground leading-relaxed">
                      {item.notes ? (
                        <span className="line-clamp-2" title={item.notes}>
                          {item.notes}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 italic">Tidak ada catatan</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit Agenda"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.companyName)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Hapus Agenda"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-6 py-3.5 bg-muted/20 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Menampilkan <strong className="text-foreground">{filteredData.length}</strong> dari{' '}
            <strong className="text-foreground">{data.length}</strong> agenda perubahan AD
          </span>
          <span className="text-[11px] font-medium text-muted-foreground/80">
            Sumber Data: Master Perusahaan (Companies)
          </span>
        </div>
      </div>

      {/* 4. Modal Pop-Up: Tambah / Edit Perubahan AD */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[540px] max-w-[540px] w-[95vw] p-0 overflow-hidden font-sans border border-border shadow-2xl rounded-2xl bg-card"
        >
          {/* Modal Header */}
          <div className="py-3.5 px-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground">
                  {editingId ? 'Edit Perubahan AD' : 'Tambah AD - Management Changes'}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  Isi data perubahan anggaran dasar untuk entitas terkait
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="size-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Form with strictly the 6 requested fields */}
          <form onSubmit={handleSaveModal} className="p-5 space-y-4">
            {/* 1. Company Name (Diambil dari master companies) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full h-9.5 px-3 pr-8 text-xs font-semibold text-foreground bg-background border border-border rounded-xl focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/10 outline-none cursor-pointer"
                >
                  <option value="">— Pilih Perusahaan (Master Companies) —</option>
                  {companyOptions.map((comp) => (
                    <option key={comp} value={comp} className="bg-card text-foreground">
                      {comp}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Nama perusahaan otomatis diambil dari master entitas.
              </p>
            </div>

            {/* 2. Agenda */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Agenda <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                type="text"
                placeholder="cth. Perubahan Susunan Direksi & Komisaris Utama"
                value={formAgenda}
                onChange={(e) => setFormAgenda(e.target.value)}
                className="h-9.5 text-xs bg-background border-border rounded-xl focus:border-[#0a2540]"
              />
            </div>

            {/* 3. Status */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">Status</label>
              <select
                value={formStatus}
                onChange={(e: any) => setFormStatus(e.target.value)}
                className="w-full h-9.5 px-3 text-xs font-semibold text-foreground bg-background border border-border rounded-xl focus:border-[#0a2540] outline-none cursor-pointer"
              >
                <option value="In progress" className="bg-card">In progress (Sedang Berjalan)</option>
                <option value="Completed" className="bg-card">Completed (Selesai)</option>
                <option value="Not started" className="bg-card">Not started (Belum Mulai)</option>
                <option value="Blocked" className="bg-card">Blocked (Terkendala)</option>
              </select>
            </div>

            {/* 4 & 5. Start Date & Complete Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Start Date</label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full h-9.5 px-3 text-xs font-mono text-foreground bg-background border border-border rounded-xl focus:border-[#0a2540] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Complete Date</label>
                <input
                  type="date"
                  value={formCompleteDate}
                  onChange={(e) => setFormCompleteDate(e.target.value)}
                  className="w-full h-9.5 px-3 text-xs font-mono text-foreground bg-background border border-border rounded-xl focus:border-[#0a2540] outline-none"
                />
              </div>
            </div>

            {/* 6. Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">Notes</label>
              <textarea
                rows={3}
                placeholder="Catatan tindak lanjut, nomor berkas, atau keterangan lainnya..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full p-2.5 text-xs text-foreground bg-background border border-border rounded-xl focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/10 outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-9 px-4 text-xs font-semibold rounded-xl border-border hover:bg-muted text-foreground"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-5 text-xs font-bold rounded-xl bg-[#0a2540] hover:bg-[#16375c] text-white shadow-xs"
              >
                {editingId ? 'Simpan Perubahan' : 'Tambah Agenda'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CSLAdMgtTracker;
