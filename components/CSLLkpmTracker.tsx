import React, { useState, useMemo, useEffect } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Copy,
  Check,
  Building2,
  Calendar,
  Layers,
  FileCheck2,
  FileSpreadsheet,
  ShieldAlert,
  AlertTriangle,
  FileText,
  BarChart3,
  ChevronRight,
  X,
  ExternalLink,
  Clock,
  Info,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  INITIAL_LKPM_STORE,
  LkpmUnit,
  LkpmCompany,
  LkpmStoreData,
  getDerivedStatus,
  getQuarterDocNote,
} from '../utils/lkpmDataHelper';

const STORAGE_KEY = 'csl_lkpm_store_v2';

interface CSLLkpmTrackerProps {
  currentUser?: UserAccount | null;
}

export const CSLLkpmTracker: React.FC<CSLLkpmTrackerProps> = ({ currentUser }) => {
  // Store data
  const [store, setStore] = useState<LkpmStoreData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed['2026'] && parsed['2025']) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_LKPM_STORE;
  });

  const [selectedYear, setSelectedYear] = useState<2026 | 2025>(2026);
  const [activeTab, setActiveTab] = useState<'dash' | 'comp'>('dash');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Detail Slide-over Panel state
  const [selectedUnit, setSelectedUnit] = useState<LkpmUnit | null>(null);

  // Add Data Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formGroup, setFormGroup] = useState<string>('MINING HOLDING');
  const [formKbli, setFormKbli] = useState<string>('');
  const [formNku, setFormNku] = useState<string>('');
  const [formPic, setFormPic] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'terlapor' | 'bukti' | 'belum' | 'nonwajib'>('terlapor');

  // Edit Unit Modal state
  const [editingUnit, setEditingUnit] = useState<LkpmUnit | null>(null);
  const [editPerusahaan, setEditPerusahaan] = useState<string>('');
  const [editGrup, setEditGrup] = useState<string>('Mining Holding');
  const [editKbli, setEditKbli] = useState<string>('');
  const [editNku, setEditNku] = useState<string>('');
  const [editPicFa, setEditPicFa] = useState<string>('');
  const [editPicCsl, setEditPicCsl] = useState<string>('');
  const [editTw1, setEditTw1] = useState<'Lapor' | 'Belum' | null>(null);
  const [editTw2, setEditTw2] = useState<'Lapor' | 'Belum' | null>(null);
  const [editTw3, setEditTw3] = useState<'Lapor' | 'Belum' | null>(null);
  const [editTw4, setEditTw4] = useState<'Lapor' | 'Belum' | null>(null);
  const [editDocument, setEditDocument] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editKategoriKhusus, setEditKategoriKhusus] = useState<string>('none');
  const [editSanksi, setEditSanksi] = useState<boolean>(false);

  // Active Year Data
  const yearData = store[selectedYear.toString() as '2026' | '2025'] || store['2026'];
  const units = yearData.unit || [];
  const companies = yearData.perusahaan || [];

  const focusQuarter: 'tw3' | 'tw4' = selectedYear === 2026 ? 'tw3' : 'tw4';
  const focusQuarterLabel = selectedYear === 2026 ? 'TW III' : 'TW IV';

  // Available groups for active year
  const groupOptions = useMemo(() => {
    if (selectedYear === 2026) {
      return ['Mining Holding', 'Mining Operating', 'Business Company'];
    }
    return ['Mining Company', 'Business Company'];
  }, [selectedYear]);

  // Available status chips for active year
  const statusOptions = useMemo(() => {
    if (selectedYear === 2026) {
      return [
        { id: 'all', label: 'Semua Status' },
        { id: 'belum', label: 'Belum Lapor' },
        { id: 'bukti', label: 'Bukti Kurang' },
        { id: 'sanksi', label: 'Sanksi' },
      ];
    }
    return [
      { id: 'all', label: 'Semua Status' },
      { id: 'cek', label: 'Perlu Cek' },
    ];
  }, [selectedYear]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Disalin: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset/Reload from seed
  const handleReload = () => {
    setStore(INITIAL_LKPM_STORE);
    localStorage.removeItem(STORAGE_KEY);
    toast.info('Data dimuat ulang dari lkpm_data.json.');
  };

  // Save changes to localStorage
  const persistStore = (newStore: LkpmStoreData) => {
    setStore(newStore);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStore));
  };

  // Open Edit Modal with unit data pre-filled
  const openEditModal = (unit: LkpmUnit) => {
    setEditingUnit(unit);
    setEditPerusahaan(unit.perusahaan);
    setEditGrup(unit.grup);
    setEditKbli(unit.kbli || '');
    setEditNku(unit.nku === '-' ? '' : (unit.nku || ''));
    setEditPicFa(unit.pic_fa === '-' ? '' : (unit.pic_fa || ''));
    setEditPicCsl(unit.pic_csl === '-' ? '' : (unit.pic_csl || ''));
    setEditTw1(unit.status.tw1);
    setEditTw2(unit.status.tw2);
    setEditTw3(unit.status.tw3);
    setEditTw4(unit.status.tw4);
    setEditDocument(unit.document || '');
    setEditNotes(unit.notes || '');
    setEditKategoriKhusus(unit.kategori_khusus || 'none');
    setEditSanksi(Boolean(unit.sanksi));
  };

  // Save changes from Edit Modal
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;

    const isPerSemester = editKategoriKhusus === 'Per-Semester';
    const isMikro = editKategoriKhusus === 'Tidak Wajib (Mikro)';

    const updatedUnit: LkpmUnit = {
      ...editingUnit,
      perusahaan: editPerusahaan.trim() || editingUnit.perusahaan,
      grup: editGrup,
      kbli: editKbli.trim(),
      nku: editNku.trim() || '-',
      pic_fa: editPicFa.trim() || '-',
      pic_csl: editPicCsl.trim(),
      document: editDocument.trim(),
      notes: editNotes.trim(),
      kategori_khusus: editKategoriKhusus === 'none' ? null : editKategoriKhusus,
      sanksi: editSanksi,
      status: {
        tw1: isPerSemester || isMikro ? null : editTw1,
        tw2: isMikro ? null : editTw2,
        tw3: isPerSemester || isMikro ? null : editTw3,
        tw4: isMikro ? null : editTw4,
      },
    };

    const updatedUnits = units.map((u) => (u.id === editingUnit.id ? updatedUnit : u));
    const newStore: LkpmStoreData = {
      ...store,
      [selectedYear.toString()]: {
        ...yearData,
        unit: updatedUnits,
      },
    };

    persistStore(newStore);
    if (selectedUnit?.id === editingUnit.id) {
      setSelectedUnit(updatedUnit);
    }
    setEditingUnit(null);
    toast.success(`Data "${updatedUnit.perusahaan}" (KBLI ${updatedUnit.kbli}) berhasil diperbarui!`);
  };

  // Delete Unit action
  const handleDeleteUnit = (unitId: string) => {
    const target = units.find((u) => u.id === unitId);
    if (!window.confirm(`Hapus baris unit LKPM "${target?.perusahaan}" (KBLI ${target?.kbli})?`)) return;

    const updatedUnits = units.filter((u) => u.id !== unitId);
    const newStore: LkpmStoreData = {
      ...store,
      [selectedYear.toString()]: {
        ...yearData,
        unit: updatedUnits,
      },
    };

    persistStore(newStore);
    if (selectedUnit?.id === unitId) {
      setSelectedUnit(null);
    }
    setEditingUnit(null);
    toast.success(`Baris unit LKPM berhasil dihapus.`);
  };

  // Add Data modal submit
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formKbli.trim()) {
      toast.error('Nama perusahaan dan KBLI wajib diisi.');
      return;
    }

    let statusVal: 'Lapor' | 'Belum' | null = null;
    let kategori_khusus: string | null = null;
    let docNote = '';

    if (formStatus === 'terlapor') {
      statusVal = 'Lapor';
      docNote = 'SNK-' + Date.now();
    } else if (formStatus === 'bukti') {
      statusVal = 'Lapor';
      docNote = '';
    } else if (formStatus === 'belum') {
      statusVal = 'Belum';
    } else if (formStatus === 'nonwajib') {
      kategori_khusus = 'Tidak Wajib (Mikro)';
    }

    const newUnit: LkpmUnit = {
      id: `unit-${selectedYear}-${Date.now()}`,
      tahun: selectedYear,
      perusahaan: formName.trim(),
      grup: formGroup,
      kegiatan: '',
      kbli: formKbli.trim(),
      nku: formNku.trim() || '-',
      kategori_khusus,
      sanksi: false,
      pic_fa: formPic.trim() || '-',
      pic_csl: '',
      notes: '',
      document: docNote,
      status: {
        tw1: null,
        tw2: null,
        tw3: selectedYear === 2026 ? statusVal : null,
        tw4: selectedYear === 2025 ? statusVal : null,
      },
    };

    const updatedUnits = [newUnit, ...units];
    const newStore: LkpmStoreData = {
      ...store,
      [selectedYear.toString()]: {
        ...yearData,
        unit: updatedUnits,
      },
    };

    persistStore(newStore);
    setIsAddModalOpen(false);
    toast.success('Data baru berhasil ditambahkan.');
    setActiveTab('comp');

    // Reset form
    setFormName('');
    setFormKbli('');
    setFormNku('');
    setFormPic('');
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      const rows = units.map((u, i) => {
        const st = getDerivedStatus(u, focusQuarter);
        return {
          No: i + 1,
          Perusahaan: u.perusahaan,
          Grup: u.grup,
          Kegiatan: u.kegiatan,
          KBLI: u.kbli,
          NKU: u.nku,
          PIC: u.pic_fa || u.pic_csl || '-',
          'TW I': u.status.tw1 || '-',
          'TW II': u.status.tw2 || '-',
          'TW III': u.status.tw3 || '-',
          'TW IV': u.status.tw4 || '-',
          [`Status ${focusQuarterLabel}`]: st.label,
          Dokumen: u.document || '-',
          Keterangan: u.notes || '-',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `LKPM ${selectedYear}`);
      XLSX.writeFile(wb, `Tracking-LKPM-${selectedYear}.xlsx`);
      toast.success(`File Excel diunduh: Tracking-LKPM-${selectedYear}.xlsx`);
    } catch {
      toast.error('Gagal mengekspor file Excel.');
    }
  };

  // Filtered units for Perusahaan table
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      // Group filter
      if (selectedGroup !== 'all') {
        const gLow = u.grup.toLowerCase();
        const selLow = selectedGroup.toLowerCase();
        if (!gLow.includes(selLow)) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const derived = getDerivedStatus(u, focusQuarter);
        if (derived.cat !== selectedStatus) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const str = `${u.perusahaan} ${u.grup} ${u.kbli} ${u.nku} ${u.pic_fa} ${u.pic_csl} ${u.notes}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });
  }, [units, selectedGroup, selectedStatus, searchQuery, focusQuarter]);

  // Action Items / Todo for Analisis view
  const todoItems = useMemo(() => {
    if (selectedYear === 2026) {
      return [
        {
          unitId: units.find((u) => u.perusahaan === 'Bersinar Abadi Energi')?.id,
          perusahaan: 'Bersinar Abadi Energi',
          grup: 'Mining Holding',
          kbli: '08105',
          masalah: 'Sanksi aktif - bukti lapor belum tercatat',
          pic: '-',
          status: 'Sanksi',
          color: 'red',
        },
        {
          unitId: units.find((u) => u.perusahaan === 'Terang Abadi Energi')?.id,
          perusahaan: 'Terang Abadi Energi',
          grup: 'Mining Holding',
          kbli: '08105',
          masalah: 'Sanksi aktif - bukti lapor belum tercatat',
          pic: '-',
          status: 'Sanksi',
          color: 'red',
        },
        {
          unitId: units.find((u) => u.perusahaan === 'Dinamika Sejahtera Mandiri')?.id,
          perusahaan: 'Dinamika Sejahtera Mandiri',
          grup: 'Mining Operating',
          kbli: '07293',
          masalah: '3 KBLI belum terlapor - ditangani legal GNR',
          pic: 'Hansdi',
          status: 'Belum Lapor',
          color: 'red',
        },
        {
          unitId: units.find((u) => u.perusahaan === 'Kalimantan Alumina Nusantara')?.id,
          perusahaan: 'Kalimantan Alumina Nusantara',
          grup: 'Mining Operating',
          kbli: '46620',
          masalah: '2 KBLI belum terlapor - ditangani legal KAN',
          pic: '-',
          status: 'Belum Lapor',
          color: 'red',
        },
        {
          unitId: units.find((u) => u.perusahaan === 'Alakasa Extrusindo')?.id,
          perusahaan: 'Alakasa Extrusindo',
          grup: 'Business Company',
          kbli: '68111',
          masalah: 'Terlapor TW III - nomor SNK belum dicatat',
          pic: 'Petrus',
          status: 'Bukti Kurang',
          color: 'amber',
        },
        {
          unitId: units.find((u) => u.perusahaan === 'Gesit Intrade')?.id,
          perusahaan: 'Gesit Intrade',
          grup: 'Business Company',
          kbli: '46511',
          masalah: '4 KBLI terlapor - nomor SNK belum dicatat',
          pic: 'Desi',
          status: 'Bukti Kurang',
          color: 'amber',
        },
      ];
    } else {
      return [
        {
          unitId: units.find((u) => u.perusahaan.includes('Sinar Bangsa') && u.kbli === '68200')?.id,
          perusahaan: 'PT Sinar Bangsa',
          grup: 'Business Company',
          kbli: '68200',
          masalah: 'Satu NKU tercatat untuk dua KBLI (68200 & 68111)',
          pic: '-',
          status: 'Perlu Cek',
          color: 'amber',
        },
        {
          unitId: units.find((u) => u.perusahaan.includes('Sinar Bangsa') && u.kbli === '68111')?.id,
          perusahaan: 'PT Sinar Bangsa',
          grup: 'Business Company',
          kbli: '68111',
          masalah: 'Satu NKU tercatat untuk dua KBLI (68200 & 68111)',
          pic: '-',
          status: 'Perlu Cek',
          color: 'amber',
        },
      ];
    }
  }, [units, selectedYear]);

  // Color classes helper for Chips & Badges
  const getBadgeClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'amber':
        return 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'red':
        return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'blue':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  // Render cell icon for Quarter
  const renderQuarterIcon = (status: 'Lapor' | 'Belum' | null) => {
    if (status === 'Lapor') {
      return (
        <span
          className="inline-flex items-center justify-center size-6 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
          title="Sudah Lapor"
        >
          <Check className="size-3.5 stroke-[2.5]" />
        </span>
      );
    }
    if (status === 'Belum') {
      return (
        <span
          className="inline-flex items-center justify-center size-6 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
          title="Belum Lapor"
        >
          <X className="size-3.5 stroke-[2.5]" />
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center justify-center size-6 rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
        title="Bukan Jadwal / Belum Ada Catatan"
      >
        <MinusCircle className="size-3.5" />
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tracking Pelaporan LKPM
          </h1>
          <div className="text-[11px] font-bold tracking-widest text-amber-700 dark:text-amber-400 uppercase mt-1">
            Routine Activity &amp; Regulatory Compliance
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 shadow-inner">
            <button
              onClick={() => {
                setSelectedYear(2026);
                setSelectedGroup('all');
                setSelectedStatus('all');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedYear === 2026
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              LKPM 2026
            </button>
            <button
              onClick={() => {
                setSelectedYear(2025);
                setSelectedGroup('all');
                setSelectedStatus('all');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedYear === 2025
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              LKPM 2025
            </button>
          </div>

          {/* Action buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 text-xs font-semibold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download className="size-3.5" />
            <span>Ekspor Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.info('Impor memakai template Excel CSL-LINK. Untuk data awal, gunakan file lkpm_data.json.')
            }
            className="gap-1.5 text-xs font-semibold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Upload className="size-3.5" />
            <span>Impor Excel</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5 text-xs font-bold bg-[#0a2540] hover:bg-[#16375c] text-white shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Tambah Data</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleReload}
            title="Muat ulang dari lkpm_data.json"
            className="size-8 text-slate-500 hover:text-slate-900"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* View Switcher: Analisis vs Perusahaan */}
      <div className="inline-flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-300/80 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('dash')}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'dash'
              ? 'bg-[#0a2540] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="size-3.5" />
          <span>Analisis</span>
        </button>
        <button
          onClick={() => setActiveTab('comp')}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'comp'
              ? 'bg-[#0a2540] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="size-3.5" />
          <span>Perusahaan</span>
        </button>
      </div>

      {/* VIEW: ANALISIS (DASHBOARD) */}
      {activeTab === 'dash' && (
        <div className="space-y-6">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Perusahaan Terdaftar */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300">
                  <Building2 className="size-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {selectedYear === 2026 ? '81' : '49'}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                  Perusahaan Terdaftar
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {selectedYear === 2026 ? '4 grup usaha · data 2026' : 'Data 2025'}
                </div>
              </div>
            </div>

            {/* KPI 2: Baris KBLI / NKU */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-300">
                  <FileText className="size-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {selectedYear === 2026 ? '70' : '52'}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                  Baris KBLI / NKU
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Unit kegiatan yang dilacak
                </div>
              </div>
            </div>

            {/* KPI 3: Terlapor */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <CheckCircle2 className="size-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {selectedYear === 2026 ? '47%' : '100%'}
                </span>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {selectedYear === 2026 ? '33' : '52'}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {selectedYear === 2026 ? 'Terlapor - TW III 2026' : 'Terlapor - TW IV 2025'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {selectedYear === 2026 ? 'Dari 70 baris KBLI/NKU' : 'Dari 52 baris KBLI/NKU'}
                </div>
              </div>
            </div>

            {/* KPI 4: Belum Lapor */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-300">
                  <AlertTriangle className="size-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  {selectedYear === 2026 ? '23 baris' : '0 baris'}
                </span>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {selectedYear === 2026 ? '23' : '0'}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {selectedYear === 2026 ? 'Belum Lapor - TW III' : 'Belum Lapor - TW IV'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {selectedYear === 2026 ? 'Umumnya ditangani legal GNR / KAN' : 'Tahun 2025 tuntas'}
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Progress & Attention Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Progress per Grup */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="size-4 text-blue-600" />
                  {selectedYear === 2026 ? 'Progress per Grup - TW III 2026' : 'Progress per Grup - TW IV 2025'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  Baris terlapor dari total baris KBLI/NKU per grup.
                </p>

                {selectedYear === 2026 ? (
                  <div className="space-y-4">
                    {/* Mining Holding */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                        <span>Mining Holding</span>
                        <span className="text-slate-500">8 dari 13 (62%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: '62%' }} />
                      </div>
                    </div>

                    {/* Business Company */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                        <span>Business Company</span>
                        <span className="text-slate-500">23 dari 32 (72%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: '72%' }} />
                      </div>
                    </div>

                    {/* Mining Operating Companies */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                        <span>Mining Operating Companies</span>
                        <span className="text-slate-500">2 dari 25 (8%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-rose-600 h-full rounded-full" style={{ width: '8%' }} />
                      </div>
                    </div>

                    {/* Di luar jadwal */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                        <span>Di luar jadwal TW III</span>
                        <span className="text-slate-500">14 baris (20%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '20%' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Mining Company */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                        <span>Mining Company</span>
                        <span className="text-slate-500">29 dari 29 (100%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>

                    {/* Business Company */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-200">
                        <span>Business Company</span>
                        <span className="text-slate-500">23 dari 23 (100%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                {selectedYear === 2026
                  ? 'Kategori di luar jadwal: pelaporan per-semester, skala mikro tidak wajib lapor, dan handover ke PM.'
                  : 'Semua unit terlapor di TW IV - tahun 2025 ditutup lengkap.'}
              </p>
            </div>

            {/* Right: Perlu Perhatian */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-600" />
                  Perlu Perhatian
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Temuan dari data tracker berjalan.
                </p>

                {selectedYear === 2026 ? (
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800">
                      <div className="p-2 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 shrink-0">
                        <ShieldAlert className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-rose-950 dark:text-rose-200">
                          Sanksi aktif - 2 perusahaan
                        </div>
                        <div className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                          Bersinar Abadi Energi · Terang Abadi Energi
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 shrink-0">
                        <FileCheck2 className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                          28 baris terlapor tanpa bukti SNK
                        </div>
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          Sudah ditandai lapor, nomor bukti belum dicatat.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                        <Clock className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-950 dark:text-blue-200">
                          Deadline berikutnya - TW IV 2026
                        </div>
                        <div className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">
                          Periode Okt-Des 2026 · batas lapor Januari 2027. Pengingat H-14, H-7, H-3 aktif.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 shrink-0">
                        <FileCheck2 className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                          1 NKU dipakai 2 KBLI
                        </div>
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          PT Sinar Bangsa - KBLI 68200 dan 68111 berbagi NKU yang sama.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                        <Clock className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-950 dark:text-blue-200">
                          3 NKU 2025 tidak berlanjut ke 2026
                        </div>
                        <div className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">
                          Perlu konfirmasi: perusahaan tutup, ganti NKU, atau belum tercatat.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          Tahun 2025 tuntas
                        </div>
                        <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                          52 dari 52 unit terlapor di TW IV.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Items / To-Do Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Daftar Tindak Lanjut &amp; Perhatian Khusus
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Perusahaan</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Masalah</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">PIC</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {todoItems.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => {
                        const target = units.find((u) => u.perusahaan === item.perusahaan && u.kbli === item.kbli);
                        if (target) setSelectedUnit(target);
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{item.perusahaan}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.grup} · KBLI {item.kbli}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {item.masalah}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-600 dark:text-slate-400">
                        {item.pic}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getBadgeClasses(
                            item.color
                          )}`}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const target = units.find((u) => u.perusahaan === item.perusahaan && u.kbli === item.kbli);
                              if (target) openEditModal(target);
                            }}
                            className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border-slate-200"
                            title="Ubah data LKPM"
                          >
                            <Pencil className="size-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const target = units.find((u) => u.perusahaan === item.perusahaan && u.kbli === item.kbli);
                              if (target) setSelectedUnit(target);
                            }}
                            className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <span>Detail</span>
                            <ChevronRight className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 pt-2">
            Data dari lkpm_data.json - ekstrak terverifikasi dari tracker Excel CSL · Mockup: cangkang CSL-LINK, susunan data ala Dewi.
          </p>
        </div>
      )}

      {/* VIEW: PERUSAHAAN (FULL DATA TABLE) */}
      {activeTab === 'comp' && (
        <div className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 p-1">
            {/* Group Filter Chips */}
            <button
              onClick={() => setSelectedGroup('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                selectedGroup === 'all'
                  ? 'bg-[#0a2540] text-white border-[#0a2540] shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              Semua Grup
            </button>
            {groupOptions.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedGroup === g
                    ? 'bg-[#0a2540] text-white border-[#0a2540] shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}

            <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* Status Filter Chips */}
            {statusOptions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStatus(s.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedStatus === s.id
                    ? 'bg-[#0a2540] text-white border-[#0a2540] shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}

            {/* Search Input */}
            <div className="ml-auto w-full sm:w-auto relative min-w-[240px]">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari perusahaan / KBLI / NKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-full text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          {/* Units Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/60 dark:bg-slate-800/60">
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] min-w-[220px]">
                      Perusahaan
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">KBLI</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] min-w-[190px]">NKU</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">PIC</th>
                    <th className="py-3 px-2 font-bold uppercase tracking-wider text-[11px] text-center">TW I</th>
                    <th
                      className="py-3 px-2 font-bold uppercase tracking-wider text-[11px] text-center"
                      title="Triwulan II / Batas Lapor Semester I"
                    >
                      TW II
                      <span className="block text-[8.5px] font-semibold text-blue-600/90 dark:text-blue-400 lowercase -mt-0.5 tracking-normal">
                        / sem I
                      </span>
                    </th>
                    <th className="py-3 px-2 font-bold uppercase tracking-wider text-[11px] text-center">TW III</th>
                    <th
                      className="py-3 px-2 font-bold uppercase tracking-wider text-[11px] text-center"
                      title="Triwulan IV / Batas Lapor Semester II"
                    >
                      TW IV
                      <span className="block text-[8.5px] font-semibold text-blue-600/90 dark:text-blue-400 lowercase -mt-0.5 tracking-normal">
                        / sem II
                      </span>
                    </th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">
                      Status {focusQuarterLabel}
                    </th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        Tidak ada baris yang cocok dengan filter atau kata kunci.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => {
                      const derived = getDerivedStatus(u, focusQuarter);
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUnit(u)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          {/* Perusahaan */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white">{u.perusahaan}</span>
                              {u.kategori_khusus === 'Per-Semester' && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                  title="Skala Usaha Kecil: Pelaporan Per-Semester"
                                >
                                  Semester
                                </span>
                              )}
                              {u.kategori_khusus === 'Tidak Wajib (Mikro)' && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                  title="Skala Usaha Mikro: Bebas Kewajiban LKPM"
                                >
                                  Mikro
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {u.grup} {u.kegiatan ? `· ${u.kegiatan}` : ''}
                            </div>
                          </td>

                          {/* KBLI */}
                          <td className="py-3.5 px-3">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {u.kbli || '-'}
                            </span>
                          </td>

                          {/* NKU */}
                          <td className="py-3.5 px-3">
                            {u.nku && u.nku !== '-' ? (
                              <div className="flex items-center gap-1.5 group/nku">
                                <span
                                  className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[170px]"
                                  title={u.nku}
                                >
                                  {u.nku}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(u.nku, u.id);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                  title="Salin NKU"
                                >
                                  {copiedId === u.id ? (
                                    <Check className="size-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* PIC */}
                          <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                            {u.pic_fa || u.pic_csl || '-'}
                          </td>

                          {/* Triwulan Icons */}
                          <td className="py-3.5 px-2 text-center">{renderQuarterIcon(u.status.tw1)}</td>
                          <td className="py-3.5 px-2 text-center">{renderQuarterIcon(u.status.tw2)}</td>
                          <td className="py-3.5 px-2 text-center">{renderQuarterIcon(u.status.tw3)}</td>
                          <td className="py-3.5 px-2 text-center">{renderQuarterIcon(u.status.tw4)}</td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getBadgeClasses(
                                derived.color
                              )}`}
                            >
                              <span className="size-1.5 rounded-full bg-current" />
                              {derived.label}
                            </span>
                          </td>

                          {/* Aksi Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(u);
                                }}
                                className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border-slate-200"
                                title="Ubah status & data LKPM"
                              >
                                <Pencil className="size-3" />
                                <span>Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUnit(u);
                                }}
                                className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <span>Detail</span>
                                <ChevronRight className="size-3" />
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
          </div>

          <p className="text-center text-xs text-slate-500 pt-2">
            Menampilkan {filteredUnits.length} dari {units.length} baris unit kegiatan LKPM {selectedYear} · Klik baris untuk detail per triwulan &amp; bukti lapor.
          </p>
        </div>
      )}

      {/* SLIDE-OVER DETAIL PANEL */}
      {selectedUnit && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedUnit(null)}
            className="fixed inset-0 bg-slate-950/40 z-50 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Panel Sheet */}
          <aside
            className="fixed top-0 right-0 bottom-0 w-[430px] max-w-[92vw] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between"
          >
            <div>
              {/* Header with Edit & Close */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedUnit.perusahaan}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    {selectedUnit.grup} · Pelaporan LKPM {selectedYear}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => openEditModal(selectedUnit)}
                    className="h-8 px-3 text-xs font-semibold gap-1.5 bg-[#0a2540] hover:bg-[#16375c] text-white rounded-lg shadow-xs"
                    title="Ubah data unit kegiatan ini"
                  >
                    <Pencil className="size-3.5" />
                    <span>Ubah</span>
                  </Button>
                  <button
                    onClick={() => setSelectedUnit(null)}
                    className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Key-Value Cells Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                    KBLI
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {selectedUnit.kbli || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                    PIC
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedUnit.pic_fa || selectedUnit.pic_csl || '-'}
                  </span>
                </div>

                <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      NKU
                    </span>
                    {selectedUnit.nku && selectedUnit.nku !== '-' && (
                      <button
                        onClick={() => handleCopy(selectedUnit.nku, 'panel-nku')}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {copiedId === 'panel-nku' ? 'Disalin!' : 'Salin'}
                      </button>
                    )}
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 break-all">
                    {selectedUnit.nku || '-'}
                  </span>
                </div>

                <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                    STATUS {focusQuarterLabel} {selectedYear}
                  </span>
                  <div>
                    {(() => {
                      const d = getDerivedStatus(selectedUnit, focusQuarter);
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getBadgeClasses(
                            d.color
                          )}`}
                        >
                          <span className="size-2 rounded-full bg-current" />
                          {d.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Rincian Per Triwulan / Semester */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {selectedUnit.kategori_khusus === 'Per-Semester' ? 'Rincian Per Semester' : 'Rincian Per Triwulan'}
                </h3>
                {selectedUnit.kategori_khusus === 'Per-Semester' && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                    Skala Usaha Kecil
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-6">
                {selectedUnit.kategori_khusus === 'Per-Semester' ? (
                  [
                    {
                      label: 'Semester I (Januari – Juni)',
                      deadline: 'Batas lapor: 1–10 Juli (TW II)',
                      val: selectedUnit.status.tw2,
                      note:
                        selectedUnit.status.tw2 === 'Lapor'
                          ? selectedUnit.document || 'Terlapor - Semester I'
                          : selectedUnit.status.tw2 === 'Belum'
                          ? 'Belum lapor Semester I'
                          : 'Belum ada catatan',
                    },
                    {
                      label: 'Semester II (Juli – Desember)',
                      deadline: 'Batas lapor: 1–10 Januari (TW IV)',
                      val: selectedUnit.status.tw4,
                      note:
                        selectedUnit.status.tw4 === 'Lapor'
                          ? selectedUnit.document || 'Terlapor - Semester II'
                          : selectedUnit.status.tw4 === 'Belum'
                          ? 'Belum lapor Semester II'
                          : selectedUnit.tahun === 2026
                          ? 'Periode berjalan - batas lapor Januari 2027'
                          : 'Belum ada catatan',
                    },
                  ].map((sem) => (
                    <div
                      key={sem.label}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800"
                    >
                      {renderQuarterIcon(sem.val)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {sem.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {sem.deadline}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
                          {sem.note}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  (['tw1', 'tw2', 'tw3', 'tw4'] as const).map((qKey, qIdx) => {
                    const qLabels = ['TW I', 'TW II', 'TW III', 'TW IV'];
                    const qVal = selectedUnit.status[qKey];
                    const docNote = getQuarterDocNote(selectedUnit, qKey);

                    return (
                      <div
                        key={qKey}
                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800"
                      >
                        {renderQuarterIcon(qVal)}
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {qLabels[qIdx]}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
                            {docNote}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Note Alert Box */}
              {selectedUnit.sanksi && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-medium leading-relaxed">
                  Menerima sanksi - jenis sanksi dan tindak lanjutnya belum tercatat di tracker.
                </div>
              )}

              {selectedUnit.kategori_khusus === 'Tidak Wajib (Mikro)' && (
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium leading-relaxed">
                  Skala usaha mikro - tidak wajib lapor LKPM (Pasal 286 ayat (2)). Baris ini dikecualikan dari hitungan wajib lapor.
                </div>
              )}

              {selectedUnit.kategori_khusus === 'Handover' && (
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium leading-relaxed">
                  Sudah handover ke PM per Q2 2026 - pencatatan di CSL berhenti setelah TW I.
                </div>
              )}

              {selectedUnit.kategori_khusus === 'Per-Semester' && (
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium leading-relaxed">
                  Pelaporan per-semester - TW I dan TW III bukan jadwal lapor perusahaan ini.
                </div>
              )}

              {selectedUnit.notes && !selectedUnit.kategori_khusus && !selectedUnit.sanksi && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium leading-relaxed">
                  {selectedUnit.notes}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6 flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs font-bold"
                onClick={() => setSelectedUnit(null)}
              >
                Tutup
              </Button>
              <Button
                className="flex-1 text-xs font-bold bg-[#0a2540] hover:bg-[#16375c] text-white gap-1.5"
                onClick={() => openEditModal(selectedUnit)}
              >
                <Pencil className="size-3.5" />
                Ubah Data
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* MODAL TAMBAH DATA */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[600px] max-w-[600px] w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden font-sans border border-[#e6e9f0] shadow-2xl rounded-2xl bg-white"
        >
          {/* Header */}
          <div className="py-3.5 px-5 border-b border-[#e6e9f0] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8effe] text-[#2f6bff] flex items-center justify-center shrink-0 shadow-2xs">
                <Plus className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-[#0a2540] tracking-tight">
                  Tambah Unit Pelaporan LKPM
                </DialogTitle>
                <DialogDescription className="text-[11px] text-[#758196] font-normal">
                  Satu baris = satu unit KBLI/NKU · Triwulan fokus: {focusQuarterLabel} {selectedYear}
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="size-7 rounded-lg text-[#758196] hover:text-[#0a2540] hover:bg-[#f6f7f9] flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-white">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-[#344054]">
                Nama Perusahaan <span className="text-[#cf3527]">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="cth. PT Contoh Sejahtera"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full h-9 px-3 text-xs font-semibold text-[#0a2540] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#344054]">
                  Grup Perusahaan <span className="text-[#cf3527]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value)}
                    className="w-full h-9 pl-3 pr-8 text-xs font-medium text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all cursor-pointer appearance-none shadow-2xs"
                  >
                    {groupOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#758196]" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#344054]">
                  KBLI (Kode Klasifikasi) <span className="text-[#cf3527]">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="cth. 64200"
                  value={formKbli}
                  onChange={(e) => setFormKbli(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono font-semibold text-[#0a2540] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#344054]">
                  NKU (Nomor Kegiatan Usaha)
                </label>
                <input
                  type="text"
                  placeholder="cth. 202107-1234-5678-9012"
                  value={formNku}
                  onChange={(e) => setFormNku(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#344054]">
                  PIC Unit
                </label>
                <input
                  type="text"
                  placeholder="Nama PIC"
                  value={formPic}
                  onChange={(e) => setFormPic(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-[#344054]">
                Status Triwulan Fokus ({focusQuarterLabel})
              </label>
              <div className="relative">
                <select
                  value={formStatus}
                  onChange={(e: any) => setFormStatus(e.target.value)}
                  className="w-full h-9 pl-3 pr-8 text-xs font-medium text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all cursor-pointer appearance-none shadow-2xs"
                >
                  <option value="terlapor">✓ Terlapor (dengan SNK)</option>
                  <option value="bukti">⚠ Terlapor - Bukti Kurang</option>
                  <option value="belum">✕ Belum Lapor</option>
                  <option value="nonwajib">— Tidak Wajib</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#758196]" />
              </div>
            </div>

            <div className="pt-3 border-t border-[#e6e9f0] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="h-8.5 px-3.5 rounded-lg border-[#d0d5dd] bg-white text-[#344054] hover:bg-[#f8f9fa] text-xs font-semibold shadow-2xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8.5 px-4 rounded-lg bg-[#0a2540] hover:bg-[#16375c] text-white text-xs font-bold shadow-xs transition-colors"
              >
                Simpan Data
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL UBAH / EDIT DATA LKPM */}
      <Dialog open={!!editingUnit} onOpenChange={(open) => !open && setEditingUnit(null)}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[620px] max-w-[620px] w-[95vw] max-h-[94vh] flex flex-col p-0 overflow-hidden font-sans border border-[#e6e9f0] shadow-2xl rounded-2xl bg-white"
        >
          {/* Header */}
          <div className="py-2.5 px-5 border-b border-[#e6e9f0] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#e8effe] text-[#2f6bff] flex items-center justify-center shrink-0 shadow-2xs">
                <Pencil className="size-3.5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-[#0a2540] tracking-tight leading-tight">
                  Ubah Data Pelaporan LKPM
                </DialogTitle>
                <DialogDescription className="text-[10.5px] text-[#758196] font-normal leading-tight">
                  Perbarui status triwulan, nomor bukti SNK, PIC, atau catatan unit kegiatan.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingUnit(null)}
              className="size-7 rounded-lg text-[#758196] hover:text-[#0a2540] hover:bg-[#f6f7f9] flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {editingUnit && (
            <form onSubmit={handleSaveEdit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                {/* Row 1: Perusahaan & Grup */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      Nama Perusahaan <span className="text-[#cf3527]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={editPerusahaan}
                      onChange={(e) => setEditPerusahaan(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs font-semibold text-[#0a2540] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all shadow-2xs"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      Grup Perusahaan <span className="text-[#cf3527]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={editGrup}
                        onChange={(e) => setEditGrup(e.target.value)}
                        className="w-full h-8 pl-2.5 pr-7 text-xs font-medium text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all cursor-pointer appearance-none shadow-2xs"
                      >
                        {groupOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-[#758196]" />
                    </div>
                  </div>
                </div>

                {/* Row 2: KBLI & NKU */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      KBLI (Kode Klasifikasi) <span className="text-[#cf3527]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="cth. 08105"
                      value={editKbli}
                      onChange={(e) => setEditKbli(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-[#0a2540] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all shadow-2xs"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      NKU (Nomor Kegiatan Usaha)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 202503-2016-0058-3705-675"
                      value={editNku}
                      onChange={(e) => setEditNku(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs font-mono text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
                    />
                  </div>
                </div>

                {/* Row 3: PIC FA & PIC CSL */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      PIC FA / Keuangan
                    </label>
                    <input
                      type="text"
                      placeholder="cth. Sandra / Dewi"
                      value={editPicFa}
                      onChange={(e) => setEditPicFa(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs font-medium text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      PIC CSL / Legal
                    </label>
                    <input
                      type="text"
                      placeholder="cth. Rudi / Tim CSL"
                      value={editPicCsl}
                      onChange={(e) => setEditPicCsl(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs font-medium text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
                    />
                  </div>
                </div>

                {/* Row 4: Skema Pelaporan & Bukti Dokumen */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      Skema / Kategori Pelaporan
                    </label>
                    <div className="relative">
                      <select
                        value={editKategoriKhusus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditKategoriKhusus(val);
                          if (val === 'Per-Semester') {
                            setEditTw1(null);
                            setEditTw3(null);
                          } else if (val === 'Tidak Wajib (Mikro)') {
                            setEditTw1(null);
                            setEditTw2(null);
                            setEditTw3(null);
                            setEditTw4(null);
                          }
                        }}
                        className="w-full h-8 pl-2.5 pr-7 text-xs font-semibold text-[#0a2540] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all cursor-pointer appearance-none shadow-2xs"
                      >
                        <option value="none">Normal (Triwulan I - IV / Menengah &amp; Besar)</option>
                        <option value="Per-Semester">Pelaporan Per-Semester (Skala Usaha Kecil)</option>
                        <option value="Tidak Wajib (Mikro)">Tidak Wajib (Skala Mikro)</option>
                        <option value="Handover">Handover ke PM (Mulai Q2)</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-[#758196]" />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      Nomor Dokumen / Bukti SNK
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: SNK-20261028-123"
                      value={editDocument}
                      onChange={(e) => setEditDocument(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs font-mono text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
                    />
                  </div>
                </div>

                {/* Row 5: Dynamic Status Box (Triwulan vs Semester vs Mikro) */}
                {editKategoriKhusus === 'Per-Semester' ? (
                  <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1.5 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-blue-950 flex items-center gap-1.5">
                        <Calendar className="size-3 text-blue-600" />
                        Status Pelaporan Per-Semester ({selectedYear})
                      </span>
                      <span className="text-[9.5px] font-semibold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full">
                        Skala Usaha Kecil (6 Bulanan)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Semester I */}
                      <div
                        className={`rounded-md border p-2 space-y-1 transition-all shadow-2xs ${
                          editTw2 === 'Lapor'
                            ? 'bg-emerald-50/80 border-emerald-200'
                            : editTw2 === 'Belum'
                            ? 'bg-rose-50/80 border-rose-200'
                            : 'bg-white border-[#e6e9f0]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#16233a]">
                            Semester I (Januari – Juni)
                          </span>
                          <span
                            className={`size-1.5 rounded-full ${
                              editTw2 === 'Lapor'
                                ? 'bg-[#12995c]'
                                : editTw2 === 'Belum'
                                ? 'bg-[#cf3527]'
                                : 'bg-[#cbd5e1]'
                            }`}
                          />
                        </div>
                        <div className="text-[9px] text-[#64748b] font-medium">
                          Batas Lapor: 1–10 Juli (TW II)
                        </div>
                        <div className="relative pt-0.5">
                          <select
                            value={editTw2 ?? 'null'}
                            onChange={(e) =>
                              setEditTw2(e.target.value === 'null' ? null : (e.target.value as any))
                            }
                            className={`w-full h-6 pl-1.5 pr-4 text-[10.5px] font-semibold rounded border appearance-none cursor-pointer transition-all ${
                              editTw2 === 'Lapor'
                                ? 'border-emerald-300 bg-white text-emerald-700'
                                : editTw2 === 'Belum'
                                ? 'border-rose-300 bg-white text-rose-700'
                                : 'border-[#e2e8f0] bg-white text-[#64748b]'
                            }`}
                          >
                            <option value="null">- Kosong</option>
                            <option value="Lapor">✓ Terlapor</option>
                            <option value="Belum">✕ Belum</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 size-2.5 text-[#94a3b8]" />
                        </div>
                      </div>

                      {/* Semester II */}
                      <div
                        className={`rounded-md border p-2 space-y-1 transition-all shadow-2xs ${
                          editTw4 === 'Lapor'
                            ? 'bg-emerald-50/80 border-emerald-200'
                            : editTw4 === 'Belum'
                            ? 'bg-rose-50/80 border-rose-200'
                            : 'bg-white border-[#e6e9f0]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#16233a]">
                            Semester II (Juli – Desember)
                          </span>
                          <span
                            className={`size-1.5 rounded-full ${
                              editTw4 === 'Lapor'
                                ? 'bg-[#12995c]'
                                : editTw4 === 'Belum'
                                ? 'bg-[#cf3527]'
                                : 'bg-[#cbd5e1]'
                            }`}
                          />
                        </div>
                        <div className="text-[9px] text-[#64748b] font-medium">
                          Batas Lapor: 1–10 Januari (TW IV)
                        </div>
                        <div className="relative pt-0.5">
                          <select
                            value={editTw4 ?? 'null'}
                            onChange={(e) =>
                              setEditTw4(e.target.value === 'null' ? null : (e.target.value as any))
                            }
                            className={`w-full h-6 pl-1.5 pr-4 text-[10.5px] font-semibold rounded border appearance-none cursor-pointer transition-all ${
                              editTw4 === 'Lapor'
                                ? 'border-emerald-300 bg-white text-emerald-700'
                                : editTw4 === 'Belum'
                                ? 'border-rose-300 bg-white text-rose-700'
                                : 'border-[#e2e8f0] bg-white text-[#64748b]'
                            }`}
                          >
                            <option value="null">- Kosong</option>
                            <option value="Lapor">✓ Terlapor</option>
                            <option value="Belum">✕ Belum</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 size-2.5 text-[#94a3b8]" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : editKategoriKhusus === 'Tidak Wajib (Mikro)' ? (
                  <div className="p-3 rounded-lg bg-slate-100/90 border border-slate-200 flex items-start gap-2.5">
                    <Info className="size-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Skala Usaha Mikro — Bebas Kewajiban LKPM
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Sesuai Pasal 286 ayat (2) Perka BKPM No. 5/2021, perusahaan skala mikro dibebaskan dari kewajiban pelaporan LKPM berkala.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#f8f9fc] border border-[#e2e8f0] space-y-1.5 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#0a2540] flex items-center gap-1.5">
                        <Calendar className="size-3 text-[#2f6bff]" />
                        Status Pelaporan Tiap Triwulan ({selectedYear})
                      </span>
                      <span className="text-[9.5px] font-medium text-[#758196]">
                        Pilih status per triwulan (Skala Menengah &amp; Besar)
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'TW I', val: editTw1, setVal: setEditTw1 },
                        { label: 'TW II', val: editTw2, setVal: setEditTw2 },
                        { label: 'TW III', val: editTw3, setVal: setEditTw3 },
                        { label: 'TW IV', val: editTw4, setVal: setEditTw4 },
                      ].map((tw) => {
                        const isLapor = tw.val === 'Lapor';
                        const isBelum = tw.val === 'Belum';
                        return (
                          <div
                            key={tw.label}
                            className={`rounded-md border p-1.5 space-y-1 transition-all shadow-2xs ${
                              isLapor
                                ? 'bg-emerald-50/70 border-emerald-200'
                                : isBelum
                                ? 'bg-rose-50/70 border-rose-200'
                                : 'bg-white border-[#e6e9f0]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9.5px] font-bold tracking-wide text-[#344054] font-mono">
                                {tw.label}
                              </span>
                              <span
                                className={`size-1.5 rounded-full ${
                                  isLapor ? 'bg-[#12995c]' : isBelum ? 'bg-[#cf3527]' : 'bg-[#cbd5e1]'
                                }`}
                              />
                            </div>
                            <div className="relative">
                              <select
                                value={tw.val ?? 'null'}
                                onChange={(e) =>
                                  tw.setVal(e.target.value === 'null' ? null : (e.target.value as any))
                                }
                                className={`w-full h-6 pl-1.5 pr-4 text-[10.5px] font-semibold rounded border appearance-none cursor-pointer transition-all ${
                                  isLapor
                                    ? 'border-emerald-300 bg-white text-emerald-700'
                                    : isBelum
                                    ? 'border-rose-300 bg-white text-rose-700'
                                    : 'border-[#e2e8f0] bg-white text-[#64748b]'
                                }`}
                              >
                                <option value="null">- Kosong</option>
                                <option value="Lapor">✓ Terlapor</option>
                                <option value="Belum">✕ Belum</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 size-2.5 text-[#94a3b8]" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Row 6: Status Sanksi & Catatan Tindak Lanjut */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      Status Sanksi BKPM / Dinas
                    </label>
                    <label
                      className={`flex items-center justify-between h-8 px-2.5 rounded-lg border transition-all cursor-pointer select-none shadow-2xs ${
                        editSanksi
                          ? 'border-rose-200 bg-rose-50/70 text-rose-800'
                          : 'border-[#d0d5dd] bg-white text-[#344054] hover:bg-[#f8f9fa]'
                      }`}
                    >
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <ShieldAlert className={`size-3.5 ${editSanksi ? 'text-rose-600' : 'text-[#94a3b8]'}`} />
                        {editSanksi ? 'Menerima Sanksi' : 'Bebas Sanksi'}
                      </span>
                      <input
                        type="checkbox"
                        checked={editSanksi}
                        onChange={(e) => setEditSanksi(e.target.checked)}
                        className="rounded border-[#d0d5dd] text-rose-600 focus:ring-rose-500 size-3.5 accent-[#cf3527] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-[10.5px] font-semibold text-[#344054]">
                      Catatan Tindak Lanjut
                    </label>
                    <input
                      type="text"
                      placeholder="Catatan progres / kendala OSS..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs font-medium text-[#16233a] bg-white border border-[#d0d5dd] rounded-lg focus:outline-none focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5 transition-all placeholder:text-[#98a2b5] shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="py-2.5 px-5 border-t border-[#e6e9f0] bg-[#fafbfc] flex items-center justify-between gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteUnit(editingUnit.id)}
                  className="h-8 px-3 rounded-lg border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold gap-1.5 shadow-2xs transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  Hapus Unit
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUnit(null)}
                    className="h-8 px-3 rounded-lg border-[#d0d5dd] bg-white text-[#344054] hover:bg-[#f8f9fa] text-xs font-semibold shadow-2xs transition-colors"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 px-3.5 rounded-lg bg-[#0a2540] hover:bg-[#16375c] text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    Simpan Perubahan
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
