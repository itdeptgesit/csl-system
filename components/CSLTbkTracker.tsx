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
  Search,
  Plus,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Building2,
  Trash2,
  Pencil,
  FileText,
  Bell,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { formatCslDate } from '../utils/cslStatusHelper';

export type TbkCategory =
  | 'Pelaporan Berkala'
  | 'Laporan Keuangan'
  | 'Annual Fee'
  | 'Keterbukaan Informasi';

export type TbkStatus =
  | 'Belum Terjadwal'
  | 'Terjadwal'
  | 'Lewat Batas'
  | 'Bukti Kurang'
  | 'Selesai';

export interface TbkEventRecord {
  id: string;
  obligationId: string;
  obligationName: string;
  description: string;
  category: TbkCategory;
  year: string;
  period: string; // e.g. 'Jan 2026', 'Q1 2026', 'Tahunan 2026'
  dueDate: string; // ISO 'YYYY-MM-DD' or ''
  pic: string;
  isCompleted: boolean;
  evidenceNumber: string;
  notes: string;
  reminderDueDate?: string;
  reminderEmails?: string;
}

// Automatic Status Computer (design.md §14 & §15)
export function computeTbkStatus(item: {
  dueDate?: string;
  isCompleted?: boolean;
  evidenceNumber?: string;
}): TbkStatus {
  if (item.isCompleted) {
    if (item.evidenceNumber && item.evidenceNumber.trim()) {
      return 'Selesai';
    }
    return 'Bukti Kurang';
  }
  if (!item.dueDate || !item.dueDate.trim()) {
    return 'Belum Terjadwal';
  }
  const today = new Date().toISOString().split('T')[0];
  if (item.dueDate < today) {
    return 'Lewat Batas';
  }
  return 'Terjadwal';
}

const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

// Initial 26 events in 2026 (from verified tbk_data.json)
const INITIAL_2026_EVENTS: TbkEventRecord[] = [
  // 1-12: Monthly Report of Securities Holder Registration (12 bulanan)
  ...MONTHS_ID.map((m, idx) => ({
    id: `tbk-monthly-${idx + 1}`,
    obligationId: 'ob-monthly',
    obligationName: 'Monthly Report of Securities Holder Registration',
    description: 'Laporan bulanan registrasi pemegang efek perusahaan.',
    category: 'Pelaporan Berkala' as TbkCategory,
    year: '2026',
    period: `${m} 2026`,
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  })),

  // 13: Laporan Realisasi Penggunaan Jasa AP dan KAP
  {
    id: 'tbk-ap-realisasi',
    obligationId: 'ob-ap-realisasi',
    obligationName: 'Laporan Realisasi Penggunaan Jasa AP dan KAP',
    description: 'Laporan realisasi penggunaan jasa Akuntan Publik dan Kantor Akuntan Publik.',
    category: 'Pelaporan Berkala',
    year: '2026',
    period: 'Tahunan 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },

  // 14: Laporan Penunjukan/Perubahan AP dan/atau KAP
  {
    id: 'tbk-ap-penunjukan',
    obligationId: 'ob-ap-penunjukan',
    obligationName: 'Laporan Penunjukan/Perubahan AP dan/atau KAP',
    description: 'Laporan penunjukan atau perubahan Akuntan Publik / Kantor Akuntan Publik.',
    category: 'Pelaporan Berkala',
    year: '2026',
    period: 'Tahunan 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },

  // 15-18: Laporan Keuangan (4 kejadian: Tahunan, Q1, Semester I, Q3)
  {
    id: 'tbk-lk-tahunan',
    obligationId: 'ob-lk-tahunan',
    obligationName: 'Laporan Keuangan Tahunan (Tahun Buku 2025)',
    description: 'Laporan Keuangan Tahunan Teraudit (Audited Financial Statements).',
    category: 'Laporan Keuangan',
    year: '2026',
    period: 'Tahunan 2025',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },
  {
    id: 'tbk-lk-q1',
    obligationId: 'ob-lk-q1',
    obligationName: 'Laporan Keuangan Triwulan I',
    description: 'Laporan Keuangan Triwulan I (Unaudited).',
    category: 'Laporan Keuangan',
    year: '2026',
    period: 'Triwulan I 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },
  {
    id: 'tbk-lk-smt1',
    obligationId: 'ob-lk-smt1',
    obligationName: 'Laporan Keuangan Tengah Tahunan (Semester I)',
    description: 'Laporan Keuangan Tengah Tahunan / Semester I.',
    category: 'Laporan Keuangan',
    year: '2026',
    period: 'Semester I 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },
  {
    id: 'tbk-lk-q3',
    obligationId: 'ob-lk-q3',
    obligationName: 'Laporan Keuangan Triwulan III',
    description: 'Laporan Keuangan Triwulan III (Unaudited).',
    category: 'Laporan Keuangan',
    year: '2026',
    period: 'Triwulan III 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },

  // 19: Public Expose (1 kejadian)
  {
    id: 'tbk-public-expose',
    obligationId: 'ob-public-expose',
    obligationName: 'Public Expose',
    description: 'Pelaksanaan Paparan Publik (Public Expose) tahunan kepada pemegang saham dan publik.',
    category: 'Keterbukaan Informasi',
    year: '2026',
    period: 'Tahunan 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },

  // 20-23: Annual Fee OJK (4 tahap)
  {
    id: 'tbk-fee-ojk-1',
    obligationId: 'ob-fee-ojk-1',
    obligationName: 'Annual Fee OJK Tahap I',
    description: 'Biaya pungutan tahunan Otoritas Jasa Keuangan Tahap I.',
    category: 'Annual Fee',
    year: '2026',
    period: 'Tahap I 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },
  {
    id: 'tbk-fee-ojk-2',
    obligationId: 'ob-fee-ojk-2',
    obligationName: 'Annual Fee OJK Tahap II',
    description: 'Biaya pungutan tahunan Otoritas Jasa Keuangan Tahap II.',
    category: 'Annual Fee',
    year: '2026',
    period: 'Tahap II 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },
  {
    id: 'tbk-fee-ojk-3',
    obligationId: 'ob-fee-ojk-3',
    obligationName: 'Annual Fee OJK Tahap III',
    description: 'Biaya pungutan tahunan Otoritas Jasa Keuangan Tahap III.',
    category: 'Annual Fee',
    year: '2026',
    period: 'Tahap III 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },
  {
    id: 'tbk-fee-ojk-4',
    obligationId: 'ob-fee-ojk-4',
    obligationName: 'Annual Fee OJK Tahap IV',
    description: 'Biaya pungutan tahunan Otoritas Jasa Keuangan Tahap IV.',
    category: 'Annual Fee',
    year: '2026',
    period: 'Tahap IV 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },

  // 24: Annual Fee BEI
  {
    id: 'tbk-fee-bei',
    obligationId: 'ob-fee-bei',
    obligationName: 'Annual Fee BEI',
    description: 'Biaya pencatatan tahunan efek (Annual Listing Fee) Bursa Efek Indonesia.',
    category: 'Annual Fee',
    year: '2026',
    period: 'Tahun 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },

  // 25: Annual Fee BAE PT Raya Saham Registra
  {
    id: 'tbk-fee-bae',
    obligationId: 'ob-fee-bae',
    obligationName: 'Annual Fee BAE PT Raya Saham Registra',
    description: 'Biaya administrasi Biro Administrasi Efek (BAE) PT Raya Saham Registra.',
    category: 'Annual Fee',
    year: '2026',
    period: 'Tahun 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },

  // 26: Annual Fee Asosiasi Emiten Indonesia (AEI)
  {
    id: 'tbk-fee-aei',
    obligationId: 'ob-fee-aei',
    obligationName: 'Annual Fee Asosiasi Emiten Indonesia (AEI)',
    description: 'Iuran tahunan keanggotaan Asosiasi Emiten Indonesia (AEI).',
    category: 'Annual Fee',
    year: '2026',
    period: 'Tahun 2026',
    dueDate: '',
    pic: '',
    isCompleted: false,
    evidenceNumber: '',
    notes: '',
  },
];

const STORAGE_KEY = 'csl_tbk_records_v2';

export const CSLTbkTracker: React.FC<{ currentUser?: UserAccount | null }> = () => {
  const [activeTab, setActiveTab] = useState<'analisis' | 'register'>('analisis');
  const [selectedYear, setSelectedYear] = useState<'2026' | '2025'>('2026');

  // Persistence State
  const [records, setRecords] = useState<TbkEventRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_2026_EVENTS;
  });

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Slide-over Detail Panel State
  const [selectedItem, setSelectedItem] = useState<TbkEventRecord | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TbkEventRecord | null>(null);
  const [formDueDate, setFormDueDate] = useState('');
  const [formPic, setFormPic] = useState('');
  const [formIsCompleted, setFormIsCompleted] = useState(false);
  const [formEvidence, setFormEvidence] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Add Data Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState<TbkCategory>('Pelaporan Berkala');
  const [addDesc, setAddDesc] = useState('');
  const [addPeriod, setAddPeriod] = useState('Tahunan 2026');
  const [addDueDate, setAddDueDate] = useState('');
  const [addPic, setAddPic] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Reminder Modal State (§17)
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<TbkEventRecord | null>(null);
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [reminderEmails, setReminderEmails] = useState('');

  // Fetch Supabase records if available
  const fetchSupabaseRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('csl_tbk_records')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: TbkEventRecord[] = data.map((d: any) => ({
          id: String(d.id),
          obligationId: d.obligation_id,
          obligationName: d.obligation_name,
          description: d.description || '',
          category: d.category as TbkCategory,
          year: d.year || '2026',
          period: d.period || '',
          dueDate: d.due_date || '',
          pic: d.pic || '',
          isCompleted: !!d.is_completed,
          evidenceNumber: d.evidence_number || '',
          notes: d.notes || '',
          reminderDueDate: d.reminder_due_date || '',
          reminderEmails: d.reminder_emails || '',
        }));
        setRecords(mapped);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      }
    } catch (e) {
      console.warn('Supabase TBK fetch fallback to local:', e);
    }
  };

  useEffect(() => {
    fetchSupabaseRecords();
  }, []);

  const persistRecords = async (newList: TbkEventRecord[]) => {
    setRecords(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  // Year filtered data
  const yearData = useMemo(() => {
    return records.filter((r) => r.year === selectedYear);
  }, [records, selectedYear]);

  // KPIs for Analisis view
  const analysisStats = useMemo(() => {
    const totalEvents = yearData.length;
    // unique obligations
    const uniqueObligations = Array.from(new Set(yearData.map((r) => r.obligationName))).length;

    // Scheduled: items that have a dueDate
    const scheduled = yearData.filter((r) => !!r.dueDate && r.dueDate.trim() !== '').length;
    const scheduledPct = totalEvents > 0 ? Math.round((scheduled / totalEvents) * 100) : 0;

    // Per Category progress
    const getCatStats = (cat: TbkCategory) => {
      const list = yearData.filter((r) => r.category === cat);
      const total = list.length;
      const ready = list.filter((r) => !!r.dueDate && r.dueDate.trim() !== '').length;
      const pct = total > 0 ? Math.round((ready / total) * 100) : 0;
      return { total, ready, pct };
    };

    const catBerkala = getCatStats('Pelaporan Berkala');
    const catKeuangan = getCatStats('Laporan Keuangan');
    const catAnnualFee = getCatStats('Annual Fee');
    const catKeterbukaan = getCatStats('Keterbukaan Informasi');

    // Unscheduled count
    const unscheduled = yearData.filter((r) => !r.dueDate || !r.dueDate.trim()).length;

    // No PIC count
    const noPic = yearData.filter((r) => !r.pic || !r.pic.trim()).length;

    return {
      uniqueEntities: 1,
      uniqueObligations,
      totalEvents,
      scheduled,
      scheduledPct,
      unscheduled,
      noPic,
      categories: {
        berkala: catBerkala,
        keuangan: catKeuangan,
        annualFee: catAnnualFee,
        keterbukaan: catKeterbukaan,
      },
    };
  }, [yearData]);

  // Filtered Register Data
  const filteredRegisterData = useMemo(() => {
    return yearData.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.obligationName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.period.toLowerCase().includes(q) ||
        item.pic.toLowerCase().includes(q) ||
        (item.evidenceNumber || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [yearData, selectedCategory, searchQuery]);

  // Handling Edit Save
  const handleOpenEdit = (item: TbkEventRecord) => {
    setEditingItem(item);
    setFormDueDate(item.dueDate || '');
    setFormPic(item.pic || '');
    setFormIsCompleted(item.isCompleted);
    setFormEvidence(item.evidenceNumber || '');
    setFormNotes(item.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedList = records.map((r) => {
      if (r.id === editingItem.id) {
        return {
          ...r,
          dueDate: formDueDate || '',
          pic: formPic.trim(),
          isCompleted: formIsCompleted,
          evidenceNumber: formEvidence.trim(),
          notes: formNotes.trim(),
        };
      }
      return r;
    });

    await persistRecords(updatedList);

    // Update selectedItem if open
    if (selectedItem && selectedItem.id === editingItem.id) {
      setSelectedItem({
        ...selectedItem,
        dueDate: formDueDate || '',
        pic: formPic.trim(),
        isCompleted: formIsCompleted,
        evidenceNumber: formEvidence.trim(),
        notes: formNotes.trim(),
      });
    }

    // Try sync Supabase
    try {
      await supabase.from('csl_tbk_records').upsert({
        id: editingItem.id,
        obligation_id: editingItem.obligationId,
        obligation_name: editingItem.obligationName,
        description: editingItem.description,
        category: editingItem.category,
        year: editingItem.year,
        period: editingItem.period,
        due_date: formDueDate || null,
        pic: formPic.trim() || null,
        is_completed: formIsCompleted,
        evidence_number: formEvidence.trim() || null,
        notes: formNotes.trim() || null,
      });
    } catch (err) {
      console.warn('Supabase save error:', err);
    }

    setIsEditModalOpen(false);
    toast.success('Data kewajiban berhasil diperbarui.');
  };

  // Handling Add
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error('Nama kewajiban wajib diisi!');
      return;
    }

    const newId = 'tbk-custom-' + Date.now();
    const newRecord: TbkEventRecord = {
      id: newId,
      obligationId: 'ob-' + Date.now(),
      obligationName: addName.trim(),
      description: addDesc.trim() || 'Kewajiban emiten PT Alakasa Industrindo Tbk.',
      category: addCategory,
      year: selectedYear,
      period: addPeriod.trim() || `Tahun ${selectedYear}`,
      dueDate: addDueDate || '',
      pic: addPic.trim(),
      isCompleted: false,
      evidenceNumber: '',
      notes: addNotes.trim(),
    };

    const nextList = [...records, newRecord];
    await persistRecords(nextList);

    // Try insert to Supabase
    try {
      await supabase.from('csl_tbk_records').insert([{
        id: newRecord.id,
        obligation_id: newRecord.obligationId,
        obligation_name: newRecord.obligationName,
        description: newRecord.description,
        category: newRecord.category,
        year: newRecord.year,
        period: newRecord.period,
        due_date: newRecord.dueDate || null,
        pic: newRecord.pic || null,
        is_completed: false,
        evidence_number: null,
        notes: newRecord.notes || null,
      }]);
    } catch (e) {
      console.warn('Supabase insert error:', e);
    }

    setIsAddModalOpen(false);
    setAddName('');
    setAddDesc('');
    setAddDueDate('');
    setAddPic('');
    setAddNotes('');
    toast.success(`Kewajiban baru "${newRecord.obligationName}" berhasil ditambahkan.`);
  };

  // Handling Delete
  const handleDeleteItem = async (id: string, name: string) => {
    const confirmed = window.confirm(`Hapus kewajiban "${name}"?`);
    if (confirmed) {
      const nextList = records.filter((r) => r.id !== id);
      await persistRecords(nextList);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
      try {
        await supabase.from('csl_tbk_records').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete error:', e);
      }
      toast.success('Data kewajiban berhasil dihapus.');
    }
  };

  // Handling Reminder Modal (§17)
  const handleOpenReminder = (item: TbkEventRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setReminderTarget(item);
    setReminderDueDate(item.reminderDueDate || item.dueDate || '');
    setReminderEmails(item.reminderEmails || 'corporatesecretary@gesit.co.id');
    setIsReminderModalOpen(true);
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTarget) return;

    const nextList = records.map((r) => {
      if (r.id === reminderTarget.id) {
        return {
          ...r,
          reminderDueDate: reminderDueDate || '',
          reminderEmails: reminderEmails.trim(),
        };
      }
      return r;
    });

    await persistRecords(nextList);
    if (selectedItem?.id === reminderTarget.id) {
      setSelectedItem({
        ...selectedItem,
        reminderDueDate: reminderDueDate || '',
        reminderEmails: reminderEmails.trim(),
      });
    }

    try {
      await supabase.from('csl_tbk_records').update({
        reminder_due_date: reminderDueDate || null,
        reminder_emails: reminderEmails.trim() || null,
      }).eq('id', reminderTarget.id);
    } catch (err) {
      console.warn('Supabase reminder save warning:', err);
    }

    setIsReminderModalOpen(false);
    toast.success('Pengingat email (H-7) berhasil dikonfigurasi.');
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredRegisterData.map((d, idx) => {
      const status = computeTbkStatus(d);
      return {
        No: idx + 1,
        Kewajiban: d.obligationName,
        Kelompok: d.category,
        Periode: d.period,
        'Jatuh Tempo': d.dueDate ? formatCslDate(d.dueDate) : '-',
        PIC: d.pic || '-',
        Status: status,
        'Nomor Bukti / Referensi': d.evidenceNumber || '-',
        'Pengingat H-7': d.reminderDueDate ? `${formatCslDate(d.reminderDueDate)} (${d.reminderEmails})` : '-',
        Catatan: d.notes || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `TBK_${selectedYear}`);
    XLSX.writeFile(wb, `CSL_Tracking_TBK_${selectedYear}.xlsx`);
    toast.success(`Data Tracking TBK ${selectedYear} berhasil diekspor ke Excel`);
  };

  // Render Status Badge with dot per design.md §14 & §15
  const renderStatusBadge = (status: TbkStatus) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#e4f6ec] border border-[#bfe8d2] text-[#12995c]">
            <span className="size-1.5 rounded-full bg-[#12995c]" />
            Selesai
          </span>
        );
      case 'Terjadwal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#e8effe] border border-[#cbdcfd] text-[#2f6bff]">
            <span className="size-1.5 rounded-full bg-[#2f6bff]" />
            Terjadwal
          </span>
        );
      case 'Lewat Batas':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fdecea] border border-[#f6cfc9] text-[#cf3527]">
            <span className="size-1.5 rounded-full bg-[#cf3527]" />
            Lewat Batas
          </span>
        );
      case 'Bukti Kurang':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fdf2dc] border border-[#f0dcab] text-[#a86e12]">
            <span className="size-1.5 rounded-full bg-[#a86e12]" />
            Bukti Kurang
          </span>
        );
      case 'Belum Terjadwal':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#eef0f4] border border-[#d8dce6] text-[#667085]">
            <span className="size-1.5 rounded-full bg-[#98a2b5]" />
            Belum Terjadwal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans animate-in fade-in duration-500">
      {/* 1. Header Bar with Year Switcher & Primary Action */}
      <PageHeader
        title="Tracking TBK"
        subtitle="ROUTINE ACTIVITY · KEWAJIBAN EMITEN"
        description="Monitoring kepatuhan dan pelaporan keterbukaan informasi PT Alakasa Industrindo Tbk"
      >
        <div className="flex items-center gap-2.5">
          {/* Year Switcher */}
          <div className="flex items-center bg-card border border-border/80 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedYear('2026')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedYear === '2026'
                  ? 'bg-[#0a2540] text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              2026
            </button>
            <button
              type="button"
              onClick={() => setSelectedYear('2025')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedYear === '2025'
                  ? 'bg-[#0a2540] text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              2025
            </button>
          </div>

          {/* Export Excel (Secondary White Button) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 px-3.5 text-xs font-semibold rounded-xl border-border bg-card text-foreground hover:bg-muted shadow-2xs gap-1.5"
          >
            <Download className="size-3.5 text-muted-foreground" />
            Ekspor Excel
          </Button>

          {/* + Tambah Data (Single Primary Navy Button §14.5) */}
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-[#0a2540] hover:bg-[#16375c] text-white shadow-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            + Tambah Data
          </Button>
        </div>
      </PageHeader>

      {/* 2. Toggle Analisis | Register (Analisis tampil pertama §13) */}
      <div className="flex items-center">
        <div className="flex items-center bg-muted/40 border border-border/70 p-1 rounded-xl shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('analisis')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'analisis'
                ? 'bg-[#0a2540] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="size-3.5" />
            Analisis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'register'
                ? 'bg-[#0a2540] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="size-3.5" />
            Register
          </button>
        </div>
      </div>

      {/* ── TAB 1: ANALISIS (Ringkasan dulu, tabel kemudian §1) ── */}
      {activeTab === 'analisis' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Entitas Tbk */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Entitas Tbk</span>
                <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                  <Building2 className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {analysisStats.uniqueEntities}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  PT Alakasa Industrindo Tbk — satu-satunya emiten di grup
                </div>
              </div>
            </div>

            {/* Card 2: Kewajiban Tercatat */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Kewajiban Tercatat</span>
                <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                  <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {analysisStats.uniqueObligations}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Register {selectedYear} — termasuk 4 tahap Annual Fee OJK
                </div>
              </div>
            </div>

            {/* Card 3: Kejadian Tahun 2026 */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Kejadian Tahun {selectedYear}</span>
                <div className="size-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center">
                  <RefreshCw className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {analysisStats.totalEvents}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  12 bulanan + 4 laporan keuangan + 4 tahap OJK + 6 tahunan
                </div>
              </div>
            </div>

            {/* Card 4: Terjadwal */}
            <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Terjadwal</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800">
                    {analysisStats.scheduledPct}%
                  </span>
                  <div className="size-8 rounded-xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center">
                    <Clock className="size-4 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {analysisStats.scheduled}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  {analysisStats.scheduled === 0
                    ? `dari ${analysisStats.totalEvents} kejadian — tanggal jatuh tempo belum diatur`
                    : `${analysisStats.scheduled} dari ${analysisStats.totalEvents} kejadian telah memiliki tenggat`}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Kejadian per Kelompok & Perlu Perhatian */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Kejadian per Kelompok */}
            <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                  <Calendar className="size-4 text-blue-600 dark:text-blue-400" />
                  <span>Kejadian per Kelompok — {selectedYear}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Terjadwal = kejadian yang sudah memiliki tanggal jatuh tempo.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Pelaporan Berkala */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Pelaporan Berkala</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {analysisStats.categories.berkala.ready} dari {analysisStats.categories.berkala.total} terjadwal
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${analysisStats.categories.berkala.pct}%` }}
                    />
                  </div>
                </div>

                {/* Laporan Keuangan */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Laporan Keuangan</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {analysisStats.categories.keuangan.ready} dari {analysisStats.categories.keuangan.total} terjadwal
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${analysisStats.categories.keuangan.pct}%` }}
                    />
                  </div>
                </div>

                {/* Annual Fee */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Annual Fee</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {analysisStats.categories.annualFee.ready} dari {analysisStats.categories.annualFee.total} terjadwal
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${analysisStats.categories.annualFee.pct}%` }}
                    />
                  </div>
                </div>

                {/* Keterbukaan Informasi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Keterbukaan Informasi</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {analysisStats.categories.keterbukaan.ready} dari {analysisStats.categories.keterbukaan.total} terjadwal
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${analysisStats.categories.keterbukaan.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Perlu Perhatian */}
            <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <span>Perlu Perhatian</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Hal yang menghalangi modul ini berjalan penuh.
                </p>
              </div>

              <div className="space-y-3">
                {/* Item 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                    <Clock className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Tanggal jatuh tempo belum diatur
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {analysisStats.unscheduled > 0
                        ? `${analysisStats.unscheduled} kejadian berstatus Belum Terjadwal — status dan pengingat H-7 belum dapat berjalan.`
                        : 'Seluruh kewajiban telah memiliki tanggal jatuh tempo dan siap dipantau.'}
                    </p>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
                  <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">
                    <RefreshCw className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Satu kewajiban berjalan tiap bulan
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Monthly Report of Securities Holder Registration menyumbang 12 dari 26 kejadian setahun.
                    </p>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                  <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                    <ExternalLink className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Annual Fee BAE dapat ditautkan ke Budget
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Pembayaran ke PT Raya Saham Registra sudah tercatat sebagai expense di Budget &amp; Expenses.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Tabel Tindak Lanjut */}
          <div className="bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border/70 bg-muted/20">
              <h3 className="text-xs font-bold text-foreground">Tindak Lanjut</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Tindak Lanjut</th>
                    <th className="py-3 px-4">Berkaitan Dengan</th>
                    <th className="py-3 px-4">PIC</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* Row 1 */}
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">
                        Tetapkan tanggal jatuh tempo untuk 15 kewajiban
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Tanpa tenggat, status Terjadwal dan pengingat H-7 tidak dapat berjalan
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">Semua kewajiban</td>
                    <td className="py-3 px-4 text-foreground">Tim CSL</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Menunggu Tenggat
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveTab('register');
                          setSelectedCategory('all');
                        }}
                        className="h-7 text-xs font-bold text-foreground hover:bg-muted"
                      >
                        Detail <ChevronRight className="size-3.5 ml-0.5" />
                      </Button>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">
                        Tautkan Annual Fee BAE ke expense di Budget
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Expense ke PT Raya Saham Registra sudah tercatat di Budget &amp; Expenses
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">Annual Fee BAE</td>
                    <td className="py-3 px-4 text-muted-foreground">—</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                        <span className="size-1.5 rounded-full bg-blue-500" />
                        Bisa Ditautkan
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveTab('register');
                          setSelectedCategory('Annual Fee');
                        }}
                        className="h-7 text-xs font-bold text-foreground hover:bg-muted"
                      >
                        Detail <ChevronRight className="size-3.5 ml-0.5" />
                      </Button>
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">
                        Tentukan PIC untuk setiap kewajiban
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {analysisStats.noPic} kejadian di {selectedYear} belum memiliki penanggung jawab
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">Semua kewajiban</td>
                    <td className="py-3 px-4 text-muted-foreground">—</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                        Belum Diatur
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveTab('register');
                          setSelectedCategory('all');
                        }}
                        className="h-7 text-xs font-bold text-foreground hover:bg-muted"
                      >
                        Detail <ChevronRight className="size-3.5 ml-0.5" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-[11px] text-center text-muted-foreground font-medium">
            Sumber data: daftar kewajiban emiten dari tim CSL, 28 Oktober 2026 · PT Alakasa Industrindo Tbk adalah satu-satunya perusahaan publik di grup · tanggal jatuh tempo belum diatur.
          </p>
        </div>
      )}

      {/* ── TAB 2: REGISTER (Tabel data satu baris = satu kejadian) ── */}
      {activeTab === 'register' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Filter Chips Bar & Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-xs">
            {/* Chips per kelompok */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: `Semua · ${yearData.length}` },
                { id: 'Pelaporan Berkala', label: `Pelaporan Berkala · ${analysisStats.categories.berkala.total}` },
                { id: 'Laporan Keuangan', label: `Laporan Keuangan · ${analysisStats.categories.keuangan.total}` },
                { id: 'Annual Fee', label: `Annual Fee · ${analysisStats.categories.annualFee.total}` },
                { id: 'Keterbukaan Informasi', label: `Keterbukaan Informasi · ${analysisStats.categories.keterbukaan.total}` },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === chip.id
                      ? 'bg-[#0a2540] text-white shadow-2xs'
                      : 'bg-background border border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari kewajiban..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 text-xs bg-background border-border/70 rounded-xl focus:border-[#0a2540]"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[260px]">Kewajiban</th>
                    <th className="py-3.5 px-4 w-[160px]">Kelompok</th>
                    <th className="py-3.5 px-4 w-[130px]">Periode</th>
                    <th className="py-3.5 px-4 w-[130px]">Jatuh Tempo</th>
                    <th className="py-3.5 px-4 w-[130px]">PIC</th>
                    <th className="py-3.5 px-4 w-[140px]">Status</th>
                    <th className="py-3.5 px-4 w-[110px] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredRegisterData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">
                        Tidak ada baris yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRegisterData.map((item) => {
                      const status = computeTbkStatus(item);
                      const hasReminder = !!item.reminderDueDate;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="hover:bg-muted/20 transition-colors cursor-pointer group"
                        >
                          {/* Kewajiban */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#0a2540] dark:text-white leading-snug">
                              {item.obligationName}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              {item.description}
                            </div>
                          </td>

                          {/* Kelompok */}
                          <td className="py-3 px-4 text-foreground font-medium">
                            {item.category}
                          </td>

                          {/* Periode */}
                          <td className="py-3 px-4 font-mono font-medium text-foreground">
                            {item.period}
                          </td>

                          {/* Jatuh Tempo */}
                          <td className="py-3 px-4 text-foreground">
                            {item.dueDate ? (
                              <div className="flex items-center gap-1 font-mono text-[11.5px]">
                                <Calendar className="size-3 text-muted-foreground shrink-0" />
                                <span>{formatCslDate(item.dueDate)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>

                          {/* PIC */}
                          <td className="py-3 px-4 text-foreground">
                            {item.pic ? (
                              <span className="font-medium">{item.pic}</span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {renderStatusBadge(status)}
                          </td>

                          {/* Action (Detail & Reminder Indicator) */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasReminder && (
                                <span
                                  className="p-1 rounded-full text-amber-600 bg-amber-50 dark:bg-amber-950/60"
                                  title={`Pengingat H-7 aktif untuk: ${item.reminderDueDate}`}
                                >
                                  <Bell className="size-3.5 fill-amber-500" />
                                </span>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-full border-border/80 text-foreground hover:bg-muted"
                              >
                                Detail <ChevronRight className="size-3 ml-0.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-3.5 bg-muted/20 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Menampilkan <strong className="text-foreground">{filteredRegisterData.length}</strong> dari{' '}
                <strong className="text-foreground">{yearData.length}</strong> kejadian kewajiban ({selectedYear})
              </span>
              <span className="text-[11px] font-medium text-muted-foreground/80">
                PT Alakasa Industrindo Tbk
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. PANEL DETAIL GESER DARI KANAN (430px §6, BUKAN DIALOG) ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop Scrim */}
          <div
            onClick={() => setSelectedItem(null)}
            className="fixed inset-0 bg-[#0a192f]/40 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* 430px Slide-Over Drawer */}
          <aside className="fixed top-0 right-0 bottom-0 w-[430px] max-w-[95vw] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border bg-muted/20 flex items-start justify-between gap-3 shrink-0">
              <div className="space-y-1 flex-1 min-w-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {selectedItem.category}
                </span>
                <h3 className="text-base font-bold text-[#0a2540] dark:text-white leading-snug">
                  {selectedItem.obligationName}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Periode: {selectedItem.period}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Status Section */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">Status Kewajiban</span>
                  {renderStatusBadge(computeTbkStatus(selectedItem))}
                </div>
                {selectedItem.dueDate ? (
                  <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    Jatuh Tempo: <strong>{formatCslDate(selectedItem.dueDate)}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    Tanggal jatuh tempo belum diatur
                  </p>
                )}
              </div>

              {/* Keterangan & Deskripsi */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Keterangan Kewajiban
                </label>
                <p className="text-xs text-foreground leading-relaxed p-3 rounded-xl bg-background border border-border">
                  {selectedItem.description}
                </p>
              </div>

              {/* PIC & Bukti */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                  <span className="text-[10.5px] font-bold uppercase text-muted-foreground">PIC / Penanggung Jawab</span>
                  <p className="text-xs font-semibold text-foreground">
                    {selectedItem.pic || 'Belum Ditugaskan'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                  <span className="text-[10.5px] font-bold uppercase text-muted-foreground">Nomor Referensi / Bukti</span>
                  <p className="text-xs font-mono font-semibold text-foreground truncate">
                    {selectedItem.evidenceNumber || 'Belum Ada'}
                  </p>
                </div>
              </div>

              {/* Catatan */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Catatan Tindak Lanjut
                </label>
                <p className="text-xs text-foreground leading-relaxed p-3 rounded-xl bg-background border border-border min-h-[50px]">
                  {selectedItem.notes || 'Tidak ada catatan tambahan.'}
                </p>
              </div>

              {/* Daftar Semua Kejadian Kewajiban Ini (misal 12 bulan untuk Monthly Report) */}
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Kejadian Terkait di {selectedItem.year}
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {records.filter((r) => r.obligationName === selectedItem.obligationName && r.year === selectedItem.year).length} kejadian
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {records
                    .filter(
                      (r) =>
                        r.obligationName === selectedItem.obligationName &&
                        r.year === selectedItem.year
                    )
                    .map((sibling) => (
                      <div
                        key={sibling.id}
                        onClick={() => setSelectedItem(sibling)}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          sibling.id === selectedItem.id
                            ? 'bg-[#0a2540] text-white border-[#0a2540]'
                            : 'bg-background hover:bg-muted border-border text-foreground'
                        }`}
                      >
                        <span className="font-semibold">{sibling.period}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono ${sibling.id === selectedItem.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {sibling.dueDate ? formatCslDate(sibling.dueDate) : 'Tenggat Kosong'}
                          </span>
                          {sibling.id === selectedItem.id && <span className="text-xs">✓</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteItem(selectedItem.id, selectedItem.obligationName)}
                className="h-8.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="size-3.5 mr-1" /> Hapus
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenReminder(selectedItem)}
                  className="h-8.5 text-xs font-semibold rounded-xl border-border hover:bg-muted"
                >
                  <Bell className="size-3.5 mr-1" /> Reminder H-7
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenEdit(selectedItem)}
                  className="h-8.5 px-3.5 text-xs font-bold rounded-xl bg-[#0a2540] hover:bg-[#16375c] text-white"
                >
                  <Pencil className="size-3.5 mr-1" /> Edit Data
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── 4. MODAL EDIT DATA (PER KEJADIAN) ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[500px] max-w-[500px] w-[95vw] p-0 overflow-hidden font-sans border border-border shadow-2xl rounded-2xl bg-card"
        >
          <div className="py-3.5 px-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Pencil className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground">
                  Edit Data Kewajiban TBK
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  {editingItem?.obligationName} ({editingItem?.period})
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="size-7 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
            {/* Tanggal Jatuh Tempo */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Tanggal Jatuh Tempo (Due Date)
              </label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full h-9.5 px-3 text-xs font-mono bg-background border border-border rounded-xl focus:border-[#0a2540] outline-none"
              />
              <p className="text-[10.5px] text-muted-foreground">
                Mengatur tanggal jatuh tempo akan otomatis mengubah status menjadi <strong>Terjadwal</strong>.
              </p>
            </div>

            {/* PIC */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                PIC / Penanggung Jawab
              </label>
              <Input
                type="text"
                placeholder="cth. Sylvia / Desi Rahmuni"
                value={formPic}
                onChange={(e) => setFormPic(e.target.value)}
                className="h-9.5 text-xs bg-background border-border rounded-xl"
              />
            </div>

            {/* Tandai Selesai Checkbox */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground">Tandai Selesai</span>
                <p className="text-[10.5px] text-muted-foreground">
                  Kewajiban telah selesai dituntaskan untuk periode ini.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formIsCompleted}
                onChange={(e) => setFormIsCompleted(e.target.checked)}
                className="size-4.5 rounded border-border text-[#0a2540] focus:ring-[#0a2540] cursor-pointer"
              />
            </div>

            {/* Nomor Referensi / Bukti Pelaporan */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Nomor Referensi / Bukti Pelaporan
              </label>
              <Input
                type="text"
                placeholder="cth. IDXnet-2026-03-019 atau No. Invoice"
                value={formEvidence}
                onChange={(e) => setFormEvidence(e.target.value)}
                className="h-9.5 text-xs font-mono bg-background border-border rounded-xl"
              />
              <p className="text-[10.5px] text-muted-foreground">
                Bila ditandai selesai tanpa nomor bukti, status menjadi <strong>Bukti Kurang</strong>. Mengisi nomor bukti mengubahnya menjadi <strong>Selesai</strong>.
              </p>
            </div>

            {/* Catatan */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Catatan
              </label>
              <textarea
                rows={2.5}
                placeholder="Keterangan tambahan..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full p-2.5 text-xs bg-background border border-border rounded-xl outline-none resize-none"
              />
            </div>

            {/* Submit buttons */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-5 text-xs font-bold rounded-xl bg-[#0a2540] hover:bg-[#16375c] text-white"
              >
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 5. MODAL TAMBAH DATA ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[500px] max-w-[500px] w-[95vw] p-0 overflow-hidden font-sans border border-border shadow-2xl rounded-2xl bg-card"
        >
          <div className="py-3.5 px-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Plus className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground">
                  Tambah Kewajiban TBK Baru
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  Entitas: PT Alakasa Industrindo Tbk
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="size-7 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSaveAdd} className="p-5 space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Nama Kewajiban <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                type="text"
                placeholder="cth. Laporan Kepemilikan Saham Manajemen"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="h-9.5 text-xs bg-background border-border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">
                  Kelompok
                </label>
                <select
                  value={addCategory}
                  onChange={(e: any) => setAddCategory(e.target.value)}
                  className="w-full h-9.5 px-3 text-xs bg-background border border-border rounded-xl outline-none"
                >
                  <option value="Pelaporan Berkala">Pelaporan Berkala</option>
                  <option value="Laporan Keuangan">Laporan Keuangan</option>
                  <option value="Annual Fee">Annual Fee</option>
                  <option value="Keterbukaan Informasi">Keterbukaan Informasi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">
                  Periode
                </label>
                <Input
                  type="text"
                  placeholder="cth. Tahunan 2026"
                  value={addPeriod}
                  onChange={(e) => setAddPeriod(e.target.value)}
                  className="h-9.5 text-xs bg-background border-border rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">
                  Jatuh Tempo Pertama (Opsional)
                </label>
                <input
                  type="date"
                  value={addDueDate}
                  onChange={(e) => setAddDueDate(e.target.value)}
                  className="w-full h-9.5 px-3 text-xs font-mono bg-background border border-border rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">
                  PIC (Opsional)
                </label>
                <Input
                  type="text"
                  placeholder="cth. Sylvia"
                  value={addPic}
                  onChange={(e) => setAddPic(e.target.value)}
                  className="h-9.5 text-xs bg-background border-border rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Deskripsi
              </label>
              <textarea
                rows={2}
                placeholder="Penjelasan kewajiban atau dasar regulasi..."
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                className="w-full p-2.5 text-xs bg-background border border-border rounded-xl outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Catatan
              </label>
              <textarea
                rows={2}
                placeholder="Catatan tambahan..."
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                className="w-full p-2.5 text-xs bg-background border border-border rounded-xl outline-none resize-none"
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-5 text-xs font-bold rounded-xl bg-[#0a2540] hover:bg-[#16375c] text-white"
              >
                Tambah Kewajiban
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 6. DIALOG EMAIL & REMINDER BAKU (design.md §17) ── */}
      <Dialog open={isReminderModalOpen} onOpenChange={setIsReminderModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[460px] max-w-[460px] w-[95vw] p-0 overflow-hidden font-sans border border-border shadow-2xl rounded-2xl bg-card"
        >
          <div className="py-3.5 px-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Bell className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground">
                  Email &amp; Reminder
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  {reminderTarget?.obligationName} ({reminderTarget?.period})
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(false)}
              className="size-7 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSaveReminder} className="p-5 space-y-4">
            {/* Field 1: Due Date (Reminder) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Due Date (Reminder) <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="date"
                value={reminderDueDate}
                onChange={(e) => setReminderDueDate(e.target.value)}
                className="w-full h-9.5 px-3 text-xs font-mono bg-background border border-border rounded-xl focus:border-[#0a2540] outline-none"
              />
            </div>

            {/* Field 2: Email Reminder */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">
                Email Reminder <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                type="text"
                placeholder="corporatesecretary@gesit.co.id, legal@gesit.co.id"
                value={reminderEmails}
                onChange={(e) => setReminderEmails(e.target.value)}
                className="h-9.5 text-xs bg-background border-border rounded-xl"
              />
              <p className="text-[10.5px] text-muted-foreground">
                Dapat memasukkan banyak email dipisahkan tanda koma.
              </p>
            </div>

            {/* §17 Notification Info Banner */}
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-300">
              <p className="font-semibold flex items-center gap-1.5">
                <Clock className="size-3.5 text-blue-600 shrink-0" />
                Aturan Pengingat Otomatis
              </p>
              <p className="text-[11px] mt-1 text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                Email pengingat baku sistem akan otomatis dikirimkan ke alamat di atas tepat <strong>1 minggu (H-7)</strong> sebelum tanggal jatuh tempo.
              </p>
            </div>

            {/* Footer buttons */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReminderModalOpen(false)}
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-5 text-xs font-bold rounded-xl bg-[#0a2540] hover:bg-[#16375c] text-white"
              >
                Simpan Pengingat
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CSLTbkTracker;
