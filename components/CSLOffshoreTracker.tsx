import React, { useState, useMemo } from 'react';
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
  Globe,
  Search,
  Plus,
  Download,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Building2,
  Trash2,
  ChevronDown,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export interface OffshoreEntity {
  id: string;
  name: string;
  jurisdiction: 'British Virgin Islands (BVI)' | 'Singapore' | 'Cayman Islands' | 'Hong Kong' | 'Seychelles' | 'Lainnya';
  incorporationDate: string;
  registrationNumber: string;
  registeredAgent: string;
  renewalDueDate: string; // e.g. '2026-05-31'
  licenseFeeUsd: number;
  status: 'Aktif' | 'Segera Jatuh Tempo' | 'Lewat Jatuh Tempo' | 'Proses Renewal' | 'Nonaktif';
  goodStandingExpiry?: string;
  economicSubstanceStatus: 'Compliant' | 'Exempt' | 'Pending Filing';
  pic: string;
  notes?: string;
}

export type OffshoreStatus = 'Aktif' | 'Segera Jatuh Tempo' | 'Lewat Jatuh Tempo' | 'Proses Renewal' | 'Nonaktif';

export function getDerivedOffshoreStatus(item: OffshoreEntity): OffshoreStatus {
  if (item.status === 'Nonaktif') return 'Nonaktif';
  if (item.status === 'Proses Renewal') return 'Proses Renewal';
  if (!item.renewalDueDate) return (item.status as OffshoreStatus) || 'Aktif';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(item.renewalDueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Lewat Jatuh Tempo';
  if (diffDays <= 60) return 'Segera Jatuh Tempo';
  return 'Aktif';
}

const INITIAL_OFFSHORE_DATA: OffshoreEntity[] = [
  {
    id: 'off-01',
    name: 'Gesit International Ltd',
    jurisdiction: 'British Virgin Islands (BVI)',
    incorporationDate: '2012-04-18',
    registrationNumber: 'BVI-1728901',
    registeredAgent: 'Trident Trust Company (BVI) Limited',
    renewalDueDate: '2026-05-31',
    licenseFeeUsd: 1250,
    status: 'Aktif',
    goodStandingExpiry: '2026-12-31',
    economicSubstanceStatus: 'Compliant',
    pic: 'Desi Rahmuni',
    notes: 'Holding offshore untuk transaksi pembiayaan internasional. Berkas renewal semester I tuntas.',
  },
  {
    id: 'off-02',
    name: 'Alakasa Global Resources Pte Ltd',
    jurisdiction: 'Singapore',
    incorporationDate: '2015-08-22',
    registrationNumber: '201529102K',
    registeredAgent: 'Portcullis (Singapore) Pte Ltd',
    renewalDueDate: '2026-08-31',
    licenseFeeUsd: 2400,
    status: 'Aktif',
    goodStandingExpiry: '2026-12-31',
    economicSubstanceStatus: 'Compliant',
    pic: 'Sylvia',
    notes: 'Annual Return ke ACRA Singapura selesai. Laporan keuangan disiapkan oleh auditor lokal.',
  },
  {
    id: 'off-03',
    name: 'Pacific Mineral Holdings Ltd',
    jurisdiction: 'British Virgin Islands (BVI)',
    incorporationDate: '2016-11-10',
    registrationNumber: 'BVI-1982734',
    registeredAgent: 'Harneys Corporate Services Limited',
    renewalDueDate: '2026-11-30',
    licenseFeeUsd: 1250,
    status: 'Segera Jatuh Tempo',
    goodStandingExpiry: '2026-11-30',
    economicSubstanceStatus: 'Compliant',
    pic: 'Desi Rahmuni',
    notes: 'Invoice licence fee dari Harneys sudah diterima Finance CSL, menunggu otorisasi pembayaran offshore.',
  },
  {
    id: 'off-04',
    name: 'JS Global Capital Partners Ltd',
    jurisdiction: 'Cayman Islands',
    incorporationDate: '2018-03-05',
    registrationNumber: 'CR-334192',
    registeredAgent: 'Appleby Global Services (Cayman) Ltd',
    renewalDueDate: '2026-01-15',
    licenseFeeUsd: 3100,
    status: 'Aktif',
    goodStandingExpiry: '2026-12-31',
    economicSubstanceStatus: 'Compliant',
    pic: 'Desi Rahmuni',
    notes: 'CIMA filing dan Annual Return fee telah dibayar di awal tahun.',
  },
  {
    id: 'off-05',
    name: 'Terra International Shipping Ltd',
    jurisdiction: 'Seychelles',
    incorporationDate: '2019-09-14',
    registrationNumber: 'SEY-219082',
    registeredAgent: 'Vistra (Seychelles) Limited',
    renewalDueDate: '2026-10-31',
    licenseFeeUsd: 950,
    status: 'Proses Renewal',
    goodStandingExpiry: '2026-10-31',
    economicSubstanceStatus: 'Pending Filing',
    pic: 'Sylvia',
    notes: 'Proses verifikasi Beneficial Ownership (BO register) terbaru dengan agen Vistra.',
  },
  {
    id: 'off-06',
    name: 'Eastern Asia Investment Corp',
    jurisdiction: 'Hong Kong',
    incorporationDate: '2014-06-30',
    registrationNumber: 'HK-2189033',
    registeredAgent: 'Tricor Services Limited',
    renewalDueDate: '2026-06-30',
    licenseFeeUsd: 1800,
    status: 'Aktif',
    goodStandingExpiry: '2026-12-31',
    economicSubstanceStatus: 'Compliant',
    pic: 'Desi Rahmuni',
    notes: 'Annual Return Form NAR1 ke Companies Registry HK diserahkan tepat waktu.',
  },
  {
    id: 'off-07',
    name: 'Asia Bauxite Trading Ltd',
    jurisdiction: 'British Virgin Islands (BVI)',
    incorporationDate: '2017-02-14',
    registrationNumber: 'BVI-1889211',
    registeredAgent: 'Trident Trust Company (BVI) Limited',
    renewalDueDate: '2026-05-31',
    licenseFeeUsd: 1250,
    status: 'Nonaktif',
    economicSubstanceStatus: 'Exempt',
    pic: 'Sylvia',
    notes: 'Entitas dalam rencana likuidasi sukarela (voluntary dissolution) setelah restrukturisasi.',
  },
];

const STORAGE_KEY = 'csl_offshore_entities_v1';

export const CSLOffshoreTracker: React.FC<{ currentUser?: UserAccount | null }> = () => {
  const [data, setData] = useState<OffshoreEntity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_OFFSHORE_DATA;
  });

  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<OffshoreEntity | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formJurisdiction, setFormJurisdiction] = useState<OffshoreEntity['jurisdiction']>('British Virgin Islands (BVI)');
  const [formRegNum, setFormRegNum] = useState('');
  const [formAgent, setFormAgent] = useState('Trident Trust');
  const [formRenewalDate, setFormRenewalDate] = useState('');
  const [formFee, setFormFee] = useState<number>(1250);
  const [formStatus, setFormStatus] = useState<OffshoreEntity['status']>('Aktif');
  const [formPic, setFormPic] = useState('Desi Rahmuni');
  const [formNotes, setFormNotes] = useState('');

  const persistData = (newList: OffshoreEntity[]) => {
    setData(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  };

  // Filtered List
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const derivedStatus = getDerivedOffshoreStatus(item);
      const matchesJurisdiction = selectedJurisdiction === 'all' || item.jurisdiction === selectedJurisdiction;
      const matchesStatus = selectedStatus === 'all' || derivedStatus === selectedStatus;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.registrationNumber.toLowerCase().includes(query) ||
        item.registeredAgent.toLowerCase().includes(query) ||
        item.pic.toLowerCase().includes(query);

      return matchesJurisdiction && matchesStatus && matchesSearch;
    });
  }, [data, selectedJurisdiction, selectedStatus, searchQuery]);

  // KPIs
  const kpis = useMemo(() => {
    const total = data.length;
    const aktif = data.filter((i) => getDerivedOffshoreStatus(i) === 'Aktif').length;
    const segera = data.filter((i) => getDerivedOffshoreStatus(i) === 'Segera Jatuh Tempo').length;
    const lewat = data.filter((i) => getDerivedOffshoreStatus(i) === 'Lewat Jatuh Tempo').length;
    const proses = data.filter((i) => getDerivedOffshoreStatus(i) === 'Proses Renewal').length;
    const nonaktif = data.filter((i) => getDerivedOffshoreStatus(i) === 'Nonaktif').length;
    const totalFee = data.filter((i) => getDerivedOffshoreStatus(i) !== 'Nonaktif').reduce((sum, i) => sum + (i.licenseFeeUsd || 0), 0);
    return { total, aktif, segera, lewat, proses, nonaktif, totalFee };
  }, [data]);

  // Export
  const handleExport = () => {
    const exportData = filteredData.map((d, idx) => ({
      No: idx + 1,
      'Nama Entitas Offshore': d.name,
      Jurisdiksi: d.jurisdiction,
      'Nomor Registrasi': d.registrationNumber,
      'Registered Agent': d.registeredAgent,
      'Jatuh Tempo Perpanjangan': d.renewalDueDate,
      'Biaya Tahunan (USD)': d.licenseFeeUsd,
      Status: getDerivedOffshoreStatus(d),
      'Economic Substance': d.economicSubstanceStatus,
      'Good Standing Valid': d.goodStandingExpiry || '-',
      PIC: d.pic,
      Catatan: d.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Offshore_Entities');
    XLSX.writeFile(wb, 'CSL-LINK_Tracking_Offshore_Entities.xlsx');
    toast.success('Data entitas offshore berhasil diekspor ke Excel');
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Nama entitas wajib diisi!');
      return;
    }

    const newEntity: OffshoreEntity = {
      id: 'off-' + Date.now(),
      name: formName.trim(),
      jurisdiction: formJurisdiction,
      incorporationDate: new Date().toISOString().split('T')[0],
      registrationNumber: formRegNum.trim() || 'REG-' + Math.floor(100000 + Math.random() * 900000),
      registeredAgent: formAgent.trim(),
      renewalDueDate: formRenewalDate || '2026-12-31',
      licenseFeeUsd: Number(formFee) || 0,
      status: formStatus,
      economicSubstanceStatus: 'Compliant',
      pic: formPic.trim(),
      notes: formNotes.trim(),
    };

    const nextList = [newEntity, ...data];
    persistData(nextList);
    setIsModalOpen(false);
    toast.success(`Entitas offshore "${newEntity.name}" berhasil ditambahkan!`);

    setFormName('');
    setFormRegNum('');
    setFormNotes('');
  };

  const getStatusBadge = (status: OffshoreEntity['status']) => {
    switch (status) {
      case 'Aktif':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#e4f6ec] border border-[#bfe8d2] text-[#12995c]">
            <span className="size-1.5 rounded-full bg-[#12995c]" />
            Aktif Sehat
          </span>
        );
      case 'Segera Jatuh Tempo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fdf2dc] border border-[#f0dcab] text-[#a86e12]">
            <span className="size-1.5 rounded-full bg-[#a86e12]" />
            Segera Jatuh Tempo
          </span>
        );
      case 'Lewat Jatuh Tempo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fdecea] border border-[#f6cfc9] text-[#cf3527]">
            <span className="size-1.5 rounded-full bg-[#cf3527]" />
            Lewat Tenggat
          </span>
        );
      case 'Proses Renewal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#e8effe] border border-[#cbdcfd] text-[#2f6bff]">
            <span className="size-1.5 rounded-full bg-[#2f6bff]" />
            Proses Renewal
          </span>
        );
      case 'Nonaktif':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#eef0f4] border border-[#d8dce6] text-[#758196]">
            <span className="size-1.5 rounded-full bg-[#758196]" />
            Nonaktif
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Baris Judul */}
      <PageHeader
        title="Tracking Offshore Co"
        subtitle="ROUTINE ACTIVITY · OFFSHORE ENTITIES"
        description="Monitoring perpanjangan, registered agent, dan kepatuhan entitas luar negeri"
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 px-3 text-xs font-semibold rounded-xl border-[#e6e9f0] bg-white text-[#16233a] hover:bg-[#f6f7f9] shadow-2xs gap-1.5"
          >
            <Download className="size-3.5 text-[#758196]" />
            Ekspor
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-[#0a2540] hover:bg-[#16375c] text-white shadow-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            + Tambah Entitas Offshore
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.success('Data offshore disinkronkan')}
            className="h-9 w-9 p-0 rounded-xl border-[#e6e9f0] bg-white text-[#758196] hover:text-[#0a2540] hover:bg-[#f6f7f9] shadow-2xs"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </PageHeader>

      {/* 2. Kartu KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e6e9f0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#758196] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Entitas Offshore</span>
            <Globe className="size-4 text-[#2f6bff]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#0a2540] font-mono">{kpis.total} Entitas</div>
            <div className="text-[11px] text-[#758196] font-medium mt-0.5">
              BVI, Singapura, Cayman & Seychelles
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e6e9f0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#758196] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Aktif & Good Standing</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e4f6ec] text-[#12995c]">
              {Math.round((kpis.aktif / kpis.total) * 100)}%
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#12995c] font-mono">{kpis.aktif}</div>
            <div className="text-[11px] text-[#758196] font-medium mt-0.5">
              Status legalitas sah & aktif
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e6e9f0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#758196] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Perlu Perhatian</span>
            <AlertTriangle className={`size-4 ${(kpis.segera + kpis.lewat) > 0 ? 'text-[#cf3527]' : 'text-[#758196]'}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${(kpis.segera + kpis.lewat) > 0 ? 'text-[#cf3527]' : 'text-[#0a2540]'}`}>
              {kpis.segera + kpis.lewat} Entitas
            </div>
            <div className="text-[11px] text-[#758196] font-medium mt-0.5">
              {kpis.lewat > 0 ? `${kpis.lewat} lewat tenggat, ${kpis.segera} segera` : `${kpis.segera} segera jatuh tempo`}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e6e9f0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#758196] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estimasi Biaya Tahunan</span>
            <span className="text-[10px] font-mono font-bold text-[#758196]">USD</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#0a2540] font-mono">
              ${kpis.totalFee.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#758196] font-medium mt-0.5">
              Annual Agent & Government Fees
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Register Table */}
      <div className="bg-white border border-[#e6e9f0] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#e6e9f0] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#fafbfc]">
          {/* Status chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'Aktif', label: 'Aktif' },
              { id: 'Segera Jatuh Tempo', label: 'Segera Jatuh Tempo' },
              { id: 'Lewat Jatuh Tempo', label: 'Lewat Tenggat' },
              { id: 'Proses Renewal', label: 'Proses Renewal' },
              { id: 'Nonaktif', label: 'Nonaktif' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedStatus(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === chip.id
                    ? 'bg-[#0a2540] text-white shadow-2xs'
                    : 'bg-white border border-[#e6e9f0] text-[#758196] hover:bg-[#f6f7f9] hover:text-[#0a2540]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#758196]" />
            <Input
              type="text"
              placeholder="Cari entitas, agen, registrasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-white border border-[#e6e9f0] rounded-xl focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e6e9f0] bg-[#fafbfc] text-[11px] font-bold text-[#758196] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Entitas Offshore</th>
                <th className="py-3 px-4">Jurisdiksi</th>
                <th className="py-3 px-4">Registered Agent</th>
                <th className="py-3 px-4">Jatuh Tempo Renewal</th>
                <th className="py-3 px-4">Biaya Tahunan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">PIC CSL</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e9f0] text-xs">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#758196] font-medium">
                    Tidak ada entitas offshore yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-[#f8f9fc] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-[#758196] text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0a2540] text-[13px] group-hover:text-[#2f6bff] transition-colors">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#758196] font-mono mt-0.5">
                        {item.registrationNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#16233a]">{item.jurisdiction}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#758196]">{item.registeredAgent}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-[#0a2540]">
                      {item.renewalDueDate}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#16233a]">
                      ${item.licenseFeeUsd.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(getDerivedOffshoreStatus(item))}</td>
                    <td className="py-3.5 px-4 font-medium text-[#16233a]">{item.pic}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center text-xs font-bold text-[#2f6bff] group-hover:underline">
                        Detail <ChevronRight className="size-3.5 ml-0.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Slide-over Detail Panel */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-[430px] bg-white h-full shadow-2xl border-l border-[#e6e9f0] flex flex-col font-sans">
            <div className="p-5 border-b border-[#e6e9f0] flex items-center justify-between shrink-0 bg-[#fafbfc]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e8effe] text-[#2f6bff] flex items-center justify-center">
                  <Globe className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0a2540]">{selectedItem.name}</h3>
                  <p className="text-[11px] text-[#758196]">{selectedItem.jurisdiction}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-lg text-[#758196] hover:bg-white hover:text-[#0a2540] flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#f8f9fc] border border-[#e6e9f0]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#758196]">Status Legalitas</span>
                  <div className="mt-1">{getStatusBadge(getDerivedOffshoreStatus(selectedItem))}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#758196]">Tenggat Perpanjangan</span>
                  <p className="font-mono font-bold text-xs text-[#0a2540] mt-1">
                    {selectedItem.renewalDueDate}
                  </p>
                </div>
              </div>

              <div className="space-y-3 divide-y divide-[#e6e9f0]">
                <div className="pt-2">
                  <span className="text-[10.5px] font-bold uppercase text-[#758196]">Nomor Registrasi</span>
                  <p className="font-mono text-xs font-bold text-[#0a2540] mt-0.5">
                    {selectedItem.registrationNumber}
                  </p>
                </div>

                <div className="pt-3">
                  <span className="text-[10.5px] font-bold uppercase text-[#758196]">Registered Agent</span>
                  <p className="font-semibold text-xs text-[#16233a] mt-0.5">
                    {selectedItem.registeredAgent}
                  </p>
                </div>

                <div className="pt-3">
                  <span className="text-[10.5px] font-bold uppercase text-[#758196]">Annual Government / Agent Fee</span>
                  <p className="font-mono text-sm font-bold text-[#0a2540] mt-0.5">
                    ${selectedItem.licenseFeeUsd.toLocaleString()} USD
                  </p>
                </div>

                <div className="pt-3">
                  <span className="text-[10.5px] font-bold uppercase text-[#758196]">Economic Substance Compliance</span>
                  <p className="font-semibold text-xs text-[#12995c] mt-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" />
                    {selectedItem.economicSubstanceStatus}
                  </p>
                </div>

                <div className="pt-3">
                  <span className="text-[10.5px] font-bold uppercase text-[#758196]">PIC CSL</span>
                  <p className="font-medium text-xs text-[#16233a] mt-0.5">{selectedItem.pic}</p>
                </div>

                <div className="pt-3">
                  <span className="text-[10.5px] font-bold uppercase text-[#758196]">Catatan Korporasi</span>
                  <p className="text-xs text-[#344054] mt-0.5 leading-relaxed bg-[#fbfbfc] p-2.5 rounded-lg border border-[#e6e9f0]">
                    {selectedItem.notes || 'Tidak ada catatan tambahan.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#e6e9f0] bg-[#fafbfc] flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const confirmed = window.confirm(`Hapus entitas offshore "${selectedItem.name}"?`);
                  if (confirmed) {
                    persistData(data.filter((d) => d.id !== selectedItem.id));
                    setSelectedItem(null);
                    toast.success('Entitas berhasil dihapus');
                  }
                }}
                className="h-8.5 px-3 text-xs text-[#cf3527] border-[#f6cfc9] hover:bg-[#fdecea]"
              >
                <Trash2 className="size-3.5 mr-1" /> Hapus
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedItem(null)}
                className="h-8.5 px-4 text-xs font-bold bg-[#0a2540] hover:bg-[#16375c] text-white"
              >
                Tutup Panel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Tambah Entitas Offshore */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[560px] max-w-[560px] w-[95vw] p-0 overflow-hidden font-sans border border-[#e6e9f0] shadow-2xl rounded-2xl bg-white"
        >
          <div className="py-3 px-5 border-b border-[#e6e9f0] bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#e8effe] text-[#2f6bff] flex items-center justify-center">
                <Globe className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-[#0a2540]">
                  Tambah Entitas Offshore
                </DialogTitle>
                <DialogDescription className="text-[10.5px] text-[#758196]">
                  Pendaftaran & Monitoring Entitas Luar Negeri
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="size-7 rounded-lg text-[#758196] hover:bg-[#f6f7f9] flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSaveModal} className="p-4 space-y-3">
            <div className="space-y-0.5">
              <label className="block text-[10.5px] font-semibold text-[#344054]">
                Nama Perusahaan Offshore <span className="text-[#cf3527]">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="cth. Gesit International Ltd"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full h-8 px-2.5 text-xs font-semibold text-[#0a2540] bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540] focus:ring-2 focus:ring-[#0a2540]/5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-0.5">
                <label className="block text-[10.5px] font-semibold text-[#344054]">Jurisdiksi</label>
                <select
                  value={formJurisdiction}
                  onChange={(e: any) => setFormJurisdiction(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540] cursor-pointer"
                >
                  <option value="British Virgin Islands (BVI)">British Virgin Islands (BVI)</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Cayman Islands">Cayman Islands</option>
                  <option value="Hong Kong">Hong Kong</option>
                  <option value="Seychelles">Seychelles</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="block text-[10.5px] font-semibold text-[#344054]">
                  Nomor Registrasi
                </label>
                <input
                  type="text"
                  placeholder="cth. BVI-1728901"
                  value={formRegNum}
                  onChange={(e) => setFormRegNum(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-0.5">
                <label className="block text-[10.5px] font-semibold text-[#344054]">
                  Registered Agent
                </label>
                <input
                  type="text"
                  placeholder="cth. Trident Trust"
                  value={formAgent}
                  onChange={(e) => setFormAgent(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540]"
                />
              </div>

              <div className="space-y-0.5">
                <label className="block text-[10.5px] font-semibold text-[#344054]">
                  Biaya Tahunan (USD)
                </label>
                <input
                  type="number"
                  placeholder="1250"
                  value={formFee}
                  onChange={(e) => setFormFee(Number(e.target.value))}
                  className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-0.5">
                <label className="block text-[10.5px] font-semibold text-[#344054]">
                  Tenggat Perpanjangan <span className="text-[#cf3527]">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={formRenewalDate}
                  onChange={(e) => setFormRenewalDate(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540]"
                />
              </div>

              <div className="space-y-0.5">
                <label className="block text-[10.5px] font-semibold text-[#344054]">Status</label>
                <select
                  value={formStatus}
                  onChange={(e: any) => setFormStatus(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540] cursor-pointer"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Segera Jatuh Tempo">Segera Jatuh Tempo</option>
                  <option value="Proses Renewal">Proses Renewal</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10.5px] font-semibold text-[#344054]">PIC CSL</label>
              <input
                type="text"
                placeholder="Nama PIC"
                value={formPic}
                onChange={(e) => setFormPic(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540]"
              />
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10.5px] font-semibold text-[#344054]">Catatan</label>
              <textarea
                rows={2}
                placeholder="Catatan korporasi atau instruksi invoice..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-[#d0d5dd] rounded-lg focus:border-[#0a2540] resize-none"
              />
            </div>

            <div className="pt-2.5 border-t border-[#e6e9f0] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 px-3 text-xs rounded-lg border-[#d0d5dd]"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 px-4 text-xs font-bold rounded-lg bg-[#0a2540] hover:bg-[#16375c] text-white"
              >
                Simpan Entitas
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
