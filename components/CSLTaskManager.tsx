import React, { useState, useRef, useEffect } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, Search, Filter, CalendarDays, X, Bell, Pencil, Upload, ExternalLink, FileText, Loader2, CheckCircle2, Clock, AlertTriangle, Layers, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { formatCslDate } from '../utils/cslStatusHelper';

// Helper: parse stored value (ISO yyyy-mm-dd or m/d/yyyy) → ISO for input type=date
function toISO(val: string): string {
  if (!val) return '';
  // already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // m/d/yyyy
  const parts = val.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return `${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return '';
}

// Helper: Indonesian display date 5 Okt 2026 (design.md §14.2)
function toDisplay(val: string): string {
  if (!val) return '';
  return formatCslDate(val);
}

// DateCell: shows date text + calendar icon; click icon opens native date picker
const DateCell: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = '5 Okt 2026' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [manualVal, setManualVal] = useState('');
  const [isManual, setIsManual] = useState(false);

  // Display value: if we have an ISO-stored value, show M/D/YYYY
  const displayValue = isManual ? manualVal : toDisplay(value);
  const isoValue = toISO(value);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setManualVal(v);
    setIsManual(true);
    // try parse as m/d/yyyy on the fly
    onChange(v);
  };

  const handleManualBlur = () => {
    setIsManual(false);
    setManualVal('');
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value; // yyyy-mm-dd
    onChange(iso);
    setIsManual(false);
  };

  return (
    <div className="group relative flex h-full min-w-[125px] items-center">
      {/* Visible text input for manual entry */}
      <input
        type="text"
        value={displayValue}
        onChange={handleManualChange}
        onBlur={handleManualBlur}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-transparent bg-transparent py-1.5 pl-2 pr-8 text-xs text-foreground outline-none transition-colors hover:border-border/60 focus:border-border focus:bg-background"
      />
      {/* Calendar icon to open hidden date input */}
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
        className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        title="Pilih tanggal"
      >
        <CalendarDays className="h-3.5 w-3.5" />
      </button>
      {/* Hidden native date input */}
      <input
        ref={inputRef}
        type="date"
        value={isoValue}
        onChange={handleDatePickerChange}
        className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
};

interface RupsItem {
  id: number;
  company: string;
  periode?: string;
  status: string;
  owner: string;
  startDate: string;
  finishDate: string;
  notes: string;
  dueDate?: string;
  reminderEmails?: string;
  method?: string;
  stage?: string;
  notaryName?: string;
  deedNumber?: string;
  deedDate?: string;
  ahuNumber?: string;
  ahuStatus?: string;
  documentUrl?: string;
  documentName?: string;
  updatedBy?: string;
  updatedAt?: string;
}

const DUMMY_RUPS_AR: RupsItem[] = [
  { id: 1, company: 'Alakasa Alumina Refineri', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: 'Akta No..... tgl ....' },
  { id: 2, company: 'Alakasa Extrusindo', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 3, company: 'Alakasa Industrindo Tbk', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: 'Akta No..... tgl ....' },
  { id: 4, company: 'Alka Niaga Industri', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: 'Akta No..... tgl ....' },
  { id: 5, company: 'Arjuna Bumi Cahaya', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: 'Akta No..... tgl ....' },
  { id: 6, company: 'Bahana Cipta Permai', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: 'Akta No..... tgl ....' },
  { id: 7, company: 'Bumi Grafika Jaya', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/24/2026', notes: 'Akta No..... tgl ....' },
  { id: 8, company: 'Catur Boga Pratama', status: 'Not started', owner: 'Sylvia', startDate: '', finishDate: '', notes: 'non-active' },
  { id: 9, company: 'DA International', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/22/2026', notes: 'Akta No..... tgl ....' },
  { id: 10, company: 'Dharma Alumas Sakti', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 11, company: 'Gesit Alumas', status: 'Blocked', owner: 'Sylvia', startDate: '', finishDate: '', notes: 'Case AHU terblokir sejak 2023, proses mencari solusinya by YA & CA' },
  { id: 12, company: 'Gesit Bumi Persada', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: 'Akta No..... tgl ....' },
  { id: 13, company: 'Gesit Graha', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: 'Akta No..... tgl ....' },
  { id: 14, company: 'Gesit Intrade', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '7/28/2026', notes: 'Akta No..... tgl ....' },
  { id: 15, company: 'Gesit Makmur Utama', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '8/3/2026', notes: 'Akta No..... tgl ....' },
  { id: 16, company: 'Gesit Maju', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: 'Akta No..... tgl ....' },
  { id: 17, company: 'Gesit Perkasa', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: 'Akta No..... tgl ....' },
  { id: 18, company: 'HTT Sarana Perkasa', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 19, company: 'Jaya Mitra Investasi', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 20, company: 'Jaya Sejahtera Investasi', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 21, company: 'Jaya Sudirman Mandiri', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: 'Akta No..... tgl ....' },
  { id: 22, company: 'Jaya Sudirman Perkasa', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: 'Akta No..... tgl ....' },
  { id: 23, company: 'JSAlu Investasi Pratama', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/22/2026', notes: 'Akta No..... tgl ....' },
  { id: 24, company: 'JSGlobal Mineral Energi', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/22/2026', notes: 'Akta No..... tgl ....' },
  { id: 25, company: 'JSCapital Investasi Gesit', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/17/2026', notes: 'Akta No..... tgl ....' },
  { id: 26, company: 'JSGlobal Energi Pratama', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/22/2026', notes: 'Akta No..... tgl ....' },
  { id: 27, company: 'JSGlobal Logistik Energi', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/22/2026', notes: 'Akta No..... tgl ....' },
  { id: 28, company: 'Kalimantan Industri Terpadu', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: 'diproses oleh legal GNR' },
  { id: 29, company: 'Lima Garda Sakti', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: 'Akta No..... tgl ....' },
  { id: 30, company: 'Lima Sudirman Perkasa', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: 'Akta No..... tgl ....' },
  { id: 31, company: 'Mitra Harapan Karya Utama', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 32, company: 'Mitra Harapan Sakti', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: 'Akta No..... tgl ....' },
  { id: 33, company: 'Mitra Senayan Sejati', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/22/2026', notes: 'Akta No..... tgl ....' },
  { id: 34, company: 'Mitra Sudirman Lestari', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 35, company: 'Mitra Sudirman Mandiri', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 36, company: 'Prodas Perdana', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 37, company: 'Sembilan Empat Investama', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: 'Akta No..... tgl ....' },
  { id: 38, company: 'Sinar Bangsa', status: 'Not started', owner: 'Sylvia', startDate: '', finishDate: '', notes: 'Belum ada keputusan dari owner (sudah 3rd Reminder)' },
  { id: 39, company: 'Sircon Development', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/23/2026', notes: '' },
  { id: 40, company: 'Sircon Griya Jaya', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/17/2026', notes: '' },
  { id: 41, company: 'Sircon Investment', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/17/2026', notes: '' },
  { id: 42, company: 'Terra Makmur Sarana', status: 'Completed', owner: 'Sylvia', startDate: '', finishDate: '7/10/2026', notes: '' },
  { id: 43, company: 'Trinitas Investment', status: 'Not started', owner: 'Sylvia', startDate: '', finishDate: '', notes: 'Belum ada keputusan dari Management (sudah 3rd Reminder)' },
  { id: 44, company: 'Andalas Inti Mulia', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 45, company: 'Baranusa Insan Gemilang', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 46, company: 'Bara Optima Sejahtera', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 47, company: 'Bumi Batu Mulia', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 48, company: 'Delta Prima Mineral', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: 'Status ownership: PPJB' },
  { id: 49, company: 'Dinamika Sejahtera Mandiri', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 50, company: 'Grahasejahtera Asri', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 51, company: 'Mandara Prima Nusantara', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 52, company: 'Merdeka Nusantara Makmur', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 53, company: 'Mineral Jaya Perkasa', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 54, company: 'Mineral Sejahtera Utama', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 55, company: 'Permata Teguh Sejahtera', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 56, company: 'Rakasa Prima Mineral', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 57, company: 'Sigma Prima Indotama', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 58, company: 'Teguh Bumi Perkasa', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 59, company: 'Vista Primanusa Persada', status: '', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 60, company: 'Gesit Sarana Perkasa', status: '', owner: '', startDate: '', finishDate: '', notes: 'Handle by JSL/GSP' },
  { id: 61, company: 'Windas Development', status: '', owner: '', startDate: '', finishDate: '', notes: 'Handle by Windas Development' },
  { id: 62, company: 'Alakasa Andalan Mitra Sejati', status: '', owner: '', startDate: '', finishDate: '', notes: 'Handle by AAMS' },
  { id: 63, company: 'Alakasa Mitra CBox', status: '', owner: '', startDate: '', finishDate: '', notes: 'Handly by AMC' },
  { id: 64, company: 'Rheem Indonesia', status: '', owner: '', startDate: '', finishDate: '', notes: 'Handle by Rheem' },
  { id: 65, company: 'Kalimantan Alumina Nusantara', status: '', owner: '', startDate: '', finishDate: '', notes: 'Handle by KAN' },
  { id: 66, company: 'Selaras Investama Globalindo', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 67, company: 'Alpha Investama Globalindo', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 68, company: 'Bersinar Abadi Energi', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' },
  { id: 69, company: 'Terang Abadi Energi', status: 'Completed', owner: 'Desi Rahmuni', startDate: '', finishDate: '', notes: '' }
];

const DUMMY_ASET = [
  { id: 1, company: 'Alakasa Extrusindo', taskName: 'Pembaharuan HGB No 16/Rawa Terate', status: 'In progress', owner: 'Sylvia', startDate: '2026-01-20', dueDate: '2027-01-24', notes: '26/08/26: Surat Balasan sudah dikirim ke JIEP' },
  { id: 2, company: 'BOC', taskName: 'AJB Kavling Emeralda', status: 'In progress', owner: '', startDate: '', dueDate: '', notes: 'Belum ada kabar. Perlu follow up' },
  { id: 3, company: 'BOC', taskName: 'Sertifikat Tanah Dutamas', status: 'In progress', owner: '', startDate: '', dueDate: '', notes: 'Sedang minta quotation ukur dan plotting sementara, sebelum dilakukan penggabungan SHM' },
  { id: 4, company: 'Gesit Foundation', taskName: 'Penggabungan Sertipikat & BN Lahan 13ha Ciloto', status: 'In progress', owner: '', startDate: '', dueDate: '', notes: '' },
  { id: 5, company: 'Gesit Foundation', taskName: 'Sertipikat & BN Lahan Lelang ex-puncak Santika', status: '', owner: '', startDate: '', dueDate: '', notes: '' },
  { id: 6, company: 'Gesit Foundation', taskName: 'AJB & BN sertipikat tambahan lahan TRCC', status: '', owner: '', startDate: '', dueDate: '', notes: '' },
  { id: 7, company: 'Gesit Foundation', taskName: 'Hibah Ruko Sutomo Medan dari Jsc to GF', status: 'Not started', owner: '', startDate: '', dueDate: '', notes: 'Mintakan penawaran Notaris: Biaya, Proses & waktunya' },
  { id: 8, company: 'Villa Rainbow Bogor', taskName: 'nama di SHGB masih a.n Msb (report di SPT pribadinya)', status: 'Not started', owner: '', startDate: '', dueDate: '', notes: 'Report to Management & get advice/acc if want to do AJB & BN Sertipikat' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Completed': return 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-semibold';
    case 'In progress': return 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 font-medium';
    case 'Not started': return 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-medium';
    case 'Blocked': return 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 font-semibold';
    default: return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium';
  }
};

const TASK_CATEGORIES = [
  'RUPS-AR',
  'OFFSHORE CO',
  'AD - MGT',
  'PERMIT',
  'ASET',
  'AGREEMENT',
  'TBK',
  'LIKUIDASI',
  'CASES',
  'PROJECT',
  'Others',
  'LDD'
];

const PAGE_SIZE = 10;

const DUMMY_AGREEMENT = [
  { id: 1, requestBy: 'Winarti', taskName: 'Market Research and Business Development Agreement GIC & GBP', status: 'Completed', owner: 'Desi Rahmuni', startDate: '2026-08-07', finishDate: '2026-08-14', notes: 'sent to Finance' },
  { id: 2, requestBy: 'Pak Jave', taskName: 'Perjanjian Kerja Sama Penyewaan Lokasi Usaha', status: 'Completed', owner: 'Sylvia', startDate: '2026-07-30', finishDate: '', notes: 'pak Yohan sent to pak Jave' },
  { id: 3, requestBy: 'Pak Maradona', taskName: 'Loan Agreement AI Tbk dan ACL, AE, ATL dan AAR', status: 'Completed', owner: 'Desi Rahmuni', startDate: '2026-08-12', finishDate: '2026-08-19', notes: 'sent to Finance' },
  { id: 4, requestBy: 'Bu Yayan', taskName: 'Market Research and Business Development Agreement TCS & ACL', status: 'In progress', owner: 'Desi Rahmuni', startDate: '2026-08-18', finishDate: '', notes: 'waiting for Finance confirmation to proceed' },
];

const currentYear = new Date().getFullYear();
const EMPTY_RUPS_FORM = { 
  company: '', 
  periode: currentYear.toString(), 
  status: '', 
  owner: '', 
  startDate: '', 
  dueDate: `${currentYear}-06-30`, // Default 6 bulan dari akhir tahun buku
  finishDate: '', 
  notes: '', 
  reminderEmails: 'corporatesecretary@gesit.co.id' 
};
const EMPTY_ASET_FORM = { company: '', taskName: '', status: '', owner: '', startDate: '', dueDate: '', notes: '' };
const EMPTY_AGREEMENT_FORM = { requestBy: '', taskName: '', status: '', owner: '', startDate: '', finishDate: '', notes: '' };

export const CSLTaskManager: React.FC<{ currentUser: UserAccount | null }> = ({ currentUser }) => {
  const [activeCategory, setActiveCategory] = useState(TASK_CATEGORIES[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rupsData, setRupsData] = useState(DUMMY_RUPS_AR);
  const [asetData, setAsetData] = useState(DUMMY_ASET);
  const [agreementData, setAgreementData] = useState(DUMMY_AGREEMENT);
  const [currentPage, setCurrentPage] = useState(1);
  const [userList, setUserList] = useState<string[]>([]);
  const [activePeriode, setActivePeriode] = useState(new Date().getFullYear().toString());
  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rupsForm, setRupsForm] = useState(EMPTY_RUPS_FORM);
  const [asetForm, setAsetForm] = useState(EMPTY_ASET_FORM);
  const [agreementForm, setAgreementForm] = useState(EMPTY_AGREEMENT_FORM);

  // Detail & Legal RUPS Modal
  const [selectedRupsDetail, setSelectedRupsDetail] = useState<RupsItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reminder Edit Modal
  const [reminderEditOpen, setReminderEditOpen] = useState(false);
  const [reminderEditTarget, setReminderEditTarget] = useState<any>(null);
  const [reminderEditDueDate, setReminderEditDueDate] = useState('');
  const [reminderEditEmails, setReminderEditEmails] = useState('');

  // Copy Year Modal State
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [sourceYear, setSourceYear] = useState(new Date().getFullYear().toString());
  const [targetYear, setTargetYear] = useState((new Date().getFullYear() + 1).toString());
  const [keepOwner, setKeepOwner] = useState(true);
  const [keepMethod, setKeepMethod] = useState(true);
  const [isCopyingYear, setIsCopyingYear] = useState(false);

  // Fetch all active users for the Owner dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('full_name')
        .eq('status', 'Active')
        .order('full_name', { ascending: true });
      if (!error && data) {
        setUserList(data.map((u: any) => u.full_name).filter(Boolean));
      }
    };
    fetchUsers();
  }, []);

  // Fetch RUPS from Supabase
  const fetchRupsData = async () => {
    try {
      const { data, error } = await supabase
        .from('csl_rups_ar')
        .select('*')
        .order('id', { ascending: true });
      
      if (!error && data && data.length > 0) {
        setRupsData(data.map(d => ({
          id: d.id,
          company: d.company || '',
          periode: d.periode || '',
          status: d.status || '',
          owner: d.owner || '',
          startDate: d.start_date || '',
          dueDate: d.due_date || '',
          finishDate: d.finish_date || '',
          notes: d.notes || '',
          reminderEmails: d.reminder_emails || '',
          method: d.method || 'Sirkuler',
          stage: d.stage || 'Drafting',
          notaryName: d.notary_name || '',
          deedNumber: d.deed_number || '',
          deedDate: d.deed_date || '',
          ahuNumber: d.ahu_number || '',
          ahuStatus: d.ahu_status || 'Pending',
          documentUrl: d.document_url || '',
          documentName: d.document_name || '',
          updatedBy: d.updated_by || '',
          updatedAt: d.updated_at || ''
        })));
      } else {
        // Fallback to dummy if table doesn't exist yet or is empty
        setRupsData(DUMMY_RUPS_AR.map(d => ({ ...d, periode: new Date().getFullYear().toString() })));
      }
    } catch {
      setRupsData(DUMMY_RUPS_AR.map(d => ({ ...d, periode: new Date().getFullYear().toString() })));
    }
  };

  useEffect(() => {
    fetchRupsData();
  }, []);

  // Fetch ASET from Supabase
  const fetchAsetData = async () => {
    try {
      const { data, error } = await supabase
        .from('csl_task_aset')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) {
        setAsetData(data.map(d => ({
          id: d.id,
          company: d.company || '',
          taskName: d.task_name || '',
          status: d.status || '',
          owner: d.owner || '',
          startDate: d.start_date || '',
          dueDate: d.due_date || '',
          notes: d.notes || ''
        })));
      } else {
        setAsetData(DUMMY_ASET);
      }
    } catch {
      setAsetData(DUMMY_ASET);
    }
  };

  useEffect(() => {
    fetchAsetData();
  }, []);

  // Fetch AGREEMENT from Supabase
  const fetchAgreementData = async () => {
    try {
      const { data, error } = await supabase
        .from('csl_task_agreement')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) {
        setAgreementData(data.map(d => ({
          id: d.id,
          requestBy: d.request_by || '',
          taskName: d.task_name || '',
          status: d.status || '',
          owner: d.owner || '',
          startDate: d.start_date || '',
          finishDate: d.finish_date || '',
          notes: d.notes || ''
        })));
      } else {
        setAgreementData(DUMMY_AGREEMENT);
      }
    } catch {
      setAgreementData(DUMMY_AGREEMENT);
    }
  };

  useEffect(() => {
    fetchAgreementData();
  }, []);

  const updateRupsInDb = (id: number, field: string, value: string) => {
    if (saveTimeoutRef.current[`${id}-${field}`]) {
      clearTimeout(saveTimeoutRef.current[`${id}-${field}`]);
    }
    // Map camelCase fields to snake_case for Supabase
    const dbField = field === 'startDate' ? 'start_date' 
      : field === 'dueDate' ? 'due_date' 
      : field === 'finishDate' ? 'finish_date' 
      : field === 'reminderEmails' ? 'reminder_emails'
      : field === 'notaryName' ? 'notary_name'
      : field === 'deedNumber' ? 'deed_number'
      : field === 'deedDate' ? 'deed_date'
      : field === 'ahuNumber' ? 'ahu_number'
      : field === 'ahuStatus' ? 'ahu_status'
      : field === 'documentUrl' ? 'document_url'
      : field === 'documentName' ? 'document_name'
      : field;
    const isDateField = dbField.endsWith('_date');
    const dbValue = isDateField ? (toISO(value) || null) : value;
    const isText = field === 'notes' || field === 'deedNumber' || field === 'ahuNumber' || field === 'notaryName';
    const delay = isText ? 700 : 150;
    
    saveTimeoutRef.current[`${id}-${field}`] = setTimeout(async () => {
      try {
        const updaterName = currentUser?.fullName || currentUser?.email || 'User';
        const updatePayload: Record<string, any> = { 
          [dbField]: dbValue,
          updated_by: updaterName,
          updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase.from('csl_rups_ar').update(updatePayload).eq('id', id).select();
        if (error && error.code !== '42P01') {
           toast.error('Gagal menyimpan: ' + error.message);
           console.error('RUPS update error:', error);
        } else if (!error) {
           // Only toast for non-text fields (notes = silent save)
           if (field !== 'notes') {
             toast.success('Disimpan', { duration: 1500 });
           }
        }
      } catch (err) {
        console.error('RUPS update catch:', err);
      }
    }, delay);
  };

  const handleUploadRupsDoc = async (file: File) => {
    if (!selectedRupsDetail) return;
    setIsUploadingDoc(true);
    const toastId = toast.loading('Mengunggah dokumen ke Google Drive...');
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = err => reject(err);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const formattedFileName = `[RUPS ${selectedRupsDetail.periode || activePeriode}] ${selectedRupsDetail.company} - ${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
        body: {
          fileName: formattedFileName,
          fileMimeType: file.type || 'application/pdf',
          fileBase64: base64Data,
          requesterEmail: currentUser?.email,
          folderType: 'rups-ar'
        }
      });

      if (uploadError || !uploadData?.success || !uploadData.gdriveUrl) {
        throw new Error(uploadError?.message || uploadData?.error || 'Gagal upload ke Google Drive');
      }

      const gdriveUrl = uploadData.gdriveUrl;
      const docName = file.name;
      const todayStr = new Date().toISOString().split('T')[0];
      const finishDateVal = selectedRupsDetail.finishDate || todayStr;
      const updaterName = currentUser?.fullName || currentUser?.email || 'User';
      const nowIso = new Date().toISOString();

      // Update state in one pass
      setSelectedRupsDetail(prev => prev ? { 
        ...prev, 
        documentUrl: gdriveUrl, 
        documentName: docName,
        status: 'Completed',
        stage: 'Selesai',
        finishDate: finishDateVal,
        updatedBy: updaterName,
        updatedAt: nowIso
      } : null);

      setRupsData(prev => prev.map(item => item.id === selectedRupsDetail.id ? {
        ...item,
        documentUrl: gdriveUrl,
        documentName: docName,
        status: 'Completed',
        stage: 'Selesai',
        finishDate: finishDateVal,
        updatedBy: updaterName,
        updatedAt: nowIso
      } : item));
      
      // Save directly to db in a single atomic update
      try {
        await supabase.from('csl_rups_ar').update({
          document_url: gdriveUrl,
          document_name: docName,
          status: 'Completed',
          stage: 'Selesai',
          finish_date: toISO(finishDateVal) || null,
          updated_by: updaterName,
          updated_at: nowIso
        }).eq('id', selectedRupsDetail.id);
      } catch (err) {
        console.warn('Atomic RUPS doc update error:', err);
      }

      // Auto-rollover: Pastikan record tahun depan otomatis dibuat untuk company ini
      const currentYearNum = parseInt(selectedRupsDetail.periode || activePeriode, 10) || new Date().getFullYear();
      const nextYearStr = (currentYearNum + 1).toString();
      const companyName = selectedRupsDetail.company;

      setTimeout(async () => {
        try {
          // Cek apakah company sudah terdaftar di periode tahun depan
          const { data: existingNext } = await supabase
            .from('csl_rups_ar')
            .select('id')
            .eq('company', companyName)
            .eq('periode', nextYearStr)
            .maybeSingle();

          if (!existingNext) {
            const nextPayload = {
              company: companyName,
              periode: nextYearStr,
              status: 'Not started',
              stage: 'Drafting',
              method: selectedRupsDetail.method || 'Sirkuler',
              due_date: `${nextYearStr}-06-30`,
              reminder_emails: selectedRupsDetail.reminderEmails || 'corporatesecretary@gesit.co.id',
              notes: `Rollover otomatis dari periode ${currentYearNum}`,
              updated_by: 'System (Auto Rollover)'
            };
            const { data: insertedNext } = await supabase.from('csl_rups_ar').insert([nextPayload]).select().single();
            if (insertedNext) {
              setRupsData(prev => [...prev, {
                id: insertedNext.id,
                company: insertedNext.company,
                periode: insertedNext.periode,
                status: insertedNext.status,
                owner: '',
                startDate: '',
                dueDate: insertedNext.due_date || `${nextYearStr}-06-30`,
                finishDate: '',
                notes: insertedNext.notes || '',
                reminderEmails: insertedNext.reminder_emails || '',
                method: insertedNext.method || 'Sirkuler',
                stage: insertedNext.stage || 'Drafting',
                updatedBy: 'System (Auto Rollover)'
              }]);
              toast.info(`Perusahaan ${companyName} otomatis disiapkan untuk Periode ${nextYearStr}`);
            }
          }
        } catch (rolloverErr) {
          console.warn('Rollover next year check:', rolloverErr);
        }
      }, 300);

      toast.success('Dokumen RUPS berhasil diunggah ke Google Drive & status Selesai', { id: toastId });
    } catch (err: any) {
      console.error('RUPS doc upload error:', err);
      toast.error('Gagal upload: ' + (err.message || 'Error tidak diketahui'), { id: toastId });
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBatchCopyYear = async () => {
    if (sourceYear === targetYear) {
      toast.error('Tahun sumber dan tahun tujuan tidak boleh sama!');
      return;
    }
    setIsCopyingYear(true);
    const toastId = toast.loading(`Sedang menyalin daftar entitas dari ${sourceYear} ke ${targetYear}...`);

    try {
      // 1. Dapatkan semua perusahaan dari tahun sumber
      const sourceItems = rupsData.filter(r => (r.periode || '').toString() === sourceYear);
      if (sourceItems.length === 0) {
        toast.error(`Tidak ditemukan data perusahaan pada Periode ${sourceYear}`, { id: toastId });
        setIsCopyingYear(false);
        return;
      }

      // 2. Dapatkan perusahaan yang sudah ada di tahun tujuan
      const existingInTarget = new Set(
        rupsData
          .filter(r => (r.periode || '').toString() === targetYear)
          .map(r => r.company.trim().toLowerCase())
      );

      // 3. Filter hanya yang belum ada di target (hindari duplikat)
      const toCopy = sourceItems.filter(item => !existingInTarget.has(item.company.trim().toLowerCase()));

      if (toCopy.length === 0) {
        toast.info(`Semua perusahaan dari Periode ${sourceYear} sudah terdaftar di Periode ${targetYear}.`, { id: toastId });
        setActivePeriode(targetYear);
        setCopyModalOpen(false);
        setIsCopyingYear(false);
        return;
      }

      const payload = toCopy.map(item => ({
        company: item.company,
        periode: targetYear,
        status: 'Not started',
        stage: 'Drafting',
        owner: keepOwner ? (item.owner || '') : '',
        method: keepMethod ? (item.method || 'Sirkuler') : 'Sirkuler',
        due_date: `${targetYear}-06-30`,
        reminder_emails: item.reminderEmails || 'corporatesecretary@gesit.co.id',
        notes: `Disalin dari Periode ${sourceYear}`,
        updated_by: currentUser?.fullName || currentUser?.email || 'User'
      }));

      // Insert ke Supabase
      const { data: inserted, error } = await supabase
        .from('csl_rups_ar')
        .insert(payload)
        .select();

      if (error && error.code !== '42P01') {
        console.warn('Supabase copy year warning:', error);
      }

      const newEntries: RupsItem[] = (inserted && inserted.length > 0)
        ? inserted.map((d: any) => ({
            id: d.id,
            company: d.company,
            periode: d.periode,
            status: d.status,
            owner: d.owner || '',
            startDate: '',
            dueDate: d.due_date || `${targetYear}-06-30`,
            finishDate: '',
            notes: d.notes || '',
            reminderEmails: d.reminder_emails || '',
            method: d.method || 'Sirkuler',
            stage: d.stage || 'Drafting',
            updatedBy: d.updated_by || 'User'
          }))
        : payload.map((p, idx) => ({
            id: Math.max(0, ...rupsData.map(r => r.id)) + idx + 1,
            company: p.company,
            periode: p.periode,
            status: p.status,
            owner: p.owner,
            startDate: '',
            dueDate: p.due_date,
            finishDate: '',
            notes: p.notes,
            reminderEmails: p.reminder_emails,
            method: p.method,
            stage: p.stage,
            updatedBy: p.updated_by
          }));

      setRupsData(prev => [...prev, ...newEntries]);
      setActivePeriode(targetYear);
      setCurrentPage(1);
      setCopyModalOpen(false);
      toast.success(`Berhasil menyalin ${newEntries.length} perusahaan ke Periode ${targetYear}!`, { id: toastId });
    } catch (err: any) {
      console.error('Copy year error:', err);
      toast.error('Gagal menyalin data: ' + (err.message || 'Error tidak diketahui'), { id: toastId });
    } finally {
      setIsCopyingYear(false);
    }
  };

  const handleUpdateRups = (id: number, field: string, value: string) => {
    const updaterName = currentUser?.fullName || currentUser?.email || 'User';
    setRupsData(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        [field]: value, 
        updatedBy: updaterName, 
        updatedAt: new Date().toISOString() 
      } : item
    ));
    updateRupsInDb(id, field, value);
  };

  const updateAsetInDb = (id: number, field: string, value: string) => {
    if (saveTimeoutRef.current[`aset-${id}-${field}`]) {
      clearTimeout(saveTimeoutRef.current[`aset-${id}-${field}`]);
    }
    const dbField = field === 'startDate' ? 'start_date' : field === 'dueDate' ? 'due_date' : field === 'taskName' ? 'task_name' : field;
    const isDateField = dbField.endsWith('_date');
    const dbValue = isDateField ? (toISO(value) || null) : value;
    const isText = field === 'notes' || field === 'taskName';
    const delay = isText ? 700 : 150;

    saveTimeoutRef.current[`aset-${id}-${field}`] = setTimeout(async () => {
      try {
        const { data, error } = await supabase.from('csl_task_aset').update({ [dbField]: dbValue }).eq('id', id).select();
        if (error && error.code !== '42P01') {
          toast.error('Gagal menyimpan: ' + error.message);
          console.error('ASET update error:', error);
        } else if (!error) {
          if (field !== 'notes') {
            toast.success('Disimpan', { duration: 1500 });
          }
        }
      } catch (err) {
        console.error('ASET update catch:', err);
      }
    }, delay);
  };

  const updateAgreementInDb = (id: number, field: string, value: string) => {
    if (saveTimeoutRef.current[`agr-${id}-${field}`]) {
      clearTimeout(saveTimeoutRef.current[`agr-${id}-${field}`]);
    }
    const dbField = field === 'startDate' ? 'start_date' : field === 'finishDate' ? 'finish_date' : field === 'taskName' ? 'task_name' : field === 'requestBy' ? 'request_by' : field;
    const isDateField = dbField.endsWith('_date');
    const dbValue = isDateField ? (toISO(value) || null) : value;
    const isText = field === 'notes' || field === 'taskName';
    const delay = isText ? 700 : 150;

    saveTimeoutRef.current[`agr-${id}-${field}`] = setTimeout(async () => {
      try {
        const { data, error } = await supabase.from('csl_task_agreement').update({ [dbField]: dbValue }).eq('id', id).select();
        if (error && error.code !== '42P01') {
          toast.error('Gagal menyimpan: ' + error.message);
          console.error('AGREEMENT update error:', error);
        } else if (!error) {
          if (field !== 'notes') {
            toast.success('Disimpan', { duration: 1500 });
          }
        }
      } catch (err) {
        console.error('AGREEMENT update catch:', err);
      }
    }, delay);
  };

  const handleUpdateAset = (id: number, field: string, value: string) => {
    setAsetData(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
    updateAsetInDb(id, field, value);
  };

  const handleUpdateAgreement = (id: number, field: string, value: string) => {
    setAgreementData(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
    updateAgreementInDb(id, field, value);
  };

  const handleSaveReminderEdit = async () => {
    if (!reminderEditTarget) return;
    const id = reminderEditTarget.id;
    const updaterName = currentUser?.fullName || currentUser?.email || 'User';
    const nowIso = new Date().toISOString();
    setRupsData(prev => prev.map(item =>
      item.id === id ? { 
        ...item, 
        dueDate: reminderEditDueDate, 
        reminderEmails: reminderEditEmails,
        updatedBy: updaterName,
        updatedAt: nowIso
      } : item
    ));
    try {
      const { error } = await supabase
        .from('csl_rups_ar')
        .update({ 
          due_date: toISO(reminderEditDueDate) || null, 
          reminder_emails: reminderEditEmails,
          updated_by: updaterName,
          updated_at: nowIso
        })
        .eq('id', id);
      if (error && error.code !== '42P01') {
        toast.error('Gagal menyimpan: ' + error.message);
      } else {
        toast.success('Reminder berhasil disimpan');
      }
    } catch (err) {
      console.error('Reminder save error:', err);
    }
    setReminderEditOpen(false);
    setReminderEditTarget(null);
  };

  const filteredRups = rupsData.filter(item => {
    const p = (item as any).periode || new Date().getFullYear().toString();
    const searchMatches = 
      item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    return p === activePeriode && searchMatches;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRups.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRups = filteredRups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ASET Pagination
  const filteredAset = asetData.filter(item =>
    item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPagesAset = Math.max(1, Math.ceil(filteredAset.length / PAGE_SIZE));
  const safePageAset = Math.min(currentPage, totalPagesAset);
  const pagedAset = filteredAset.slice((safePageAset - 1) * PAGE_SIZE, safePageAset * PAGE_SIZE);

  // AGREEMENT Pagination
  const filteredAgreement = agreementData.filter(item =>
    item.requestBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPagesAgreement = Math.max(1, Math.ceil(filteredAgreement.length / PAGE_SIZE));
  const safePageAgreement = Math.min(currentPage, totalPagesAgreement);
  const pagedAgreement = filteredAgreement.slice((safePageAgreement - 1) * PAGE_SIZE, safePageAgreement * PAGE_SIZE);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleAddTask = async () => {
    if (activeCategory === 'RUPS-AR') {
      if (!rupsForm.company.trim()) { toast.error('Company wajib diisi!'); return; }
      
      const updaterName = currentUser?.fullName || currentUser?.email || 'User';
      const nowIso = new Date().toISOString();

      const payload = {
        company: rupsForm.company,
        periode: (rupsForm as any).periode || new Date().getFullYear().toString(),
        status: rupsForm.status,
        owner: rupsForm.owner || '',
        start_date: toISO(rupsForm.startDate) || null,
        due_date: toISO((rupsForm as any).dueDate) || null,
        finish_date: toISO(rupsForm.finishDate) || null,
        notes: rupsForm.notes,
        reminder_emails: (rupsForm as any).reminderEmails || '',
        updated_by: updaterName,
        updated_at: nowIso
      };

      try {
        let { data, error } = await supabase.from('csl_rups_ar').insert([payload]).select().single();
        if (error && (error.code === '42501' || error.message?.includes('sequence'))) {
          // Sequence permission fallback: supply explicit ID
          const nextId = Math.max(0, ...rupsData.map(r => r.id)) + 1;
          const retryRes = await supabase.from('csl_rups_ar').insert([{ id: nextId, ...payload }]).select().single();
          data = retryRes.data;
          error = retryRes.error;
        }
        if (error && error.code !== '42P01') {
          toast.error('Gagal tambah task: ' + error.message);
          return;
        }
        
        const newEntry = data ? {
          id: data.id,
          company: data.company || '',
          periode: data.periode || '',
          status: data.status || '',
          owner: data.owner || '',
          startDate: data.start_date || '',
          dueDate: data.due_date || '',
          finishDate: data.finish_date || '',
          notes: data.notes || '',
          reminderEmails: data.reminder_emails || '',
          updatedBy: updaterName,
          updatedAt: nowIso
        } : { id: Math.max(0, ...rupsData.map(r => r.id)) + 1, ...rupsForm, updatedBy: updaterName, updatedAt: nowIso };

        setRupsData(prev => [newEntry, ...prev]);
        setRupsForm(EMPTY_RUPS_FORM);
        toast.success('Task RUPS-AR berhasil ditambahkan!');
      } catch (err) {
        // Local fallback
        const newId = Math.max(0, ...rupsData.map(r => r.id)) + 1;
        setRupsData(prev => [{ id: newId, ...rupsForm, updatedBy: updaterName, updatedAt: nowIso }, ...prev]);
        setRupsForm(EMPTY_RUPS_FORM);
        toast.success('Task RUPS-AR berhasil ditambahkan (Lokal)');
      }
    } else if (activeCategory === 'ASET') {
      if (!asetForm.company.trim()) { toast.error('Company wajib diisi!'); return; }

      const payload = {
        company: asetForm.company,
        task_name: asetForm.taskName,
        status: asetForm.status,
        owner: asetForm.owner,
        start_date: asetForm.startDate || null,
        due_date: asetForm.dueDate || null,
        notes: asetForm.notes
      };

      try {
        const { data, error } = await supabase.from('csl_task_aset').insert([payload]).select().single();
        if (error && error.code !== '42P01') {
          toast.error('Gagal tambah task: ' + error.message);
          return;
        }

        const newEntry = data ? {
          id: data.id,
          company: data.company || '',
          taskName: data.task_name || '',
          status: data.status || '',
          owner: data.owner || '',
          startDate: data.start_date || '',
          dueDate: data.due_date || '',
          notes: data.notes || ''
        } : { id: Math.max(0, ...asetData.map(r => r.id)) + 1, ...asetForm };

        setAsetData(prev => [newEntry, ...prev]);
        setAsetForm(EMPTY_ASET_FORM);
        toast.success('Task ASET berhasil ditambahkan!');
      } catch (err) {
        const newId = Math.max(0, ...asetData.map(r => r.id)) + 1;
        setAsetData(prev => [{ id: newId, ...asetForm }, ...prev]);
        setAsetForm(EMPTY_ASET_FORM);
        toast.success('Task ASET berhasil ditambahkan (Lokal)');
      }
    } else if (activeCategory === 'AGREEMENT') {
      if (!agreementForm.taskName.trim()) { toast.error('Task wajib diisi!'); return; }

      const payload = {
        request_by: agreementForm.requestBy,
        task_name: agreementForm.taskName,
        status: agreementForm.status,
        owner: agreementForm.owner,
        start_date: agreementForm.startDate || null,
        finish_date: agreementForm.finishDate || null,
        notes: agreementForm.notes
      };

      try {
        const { data, error } = await supabase.from('csl_task_agreement').insert([payload]).select().single();
        if (error && error.code !== '42P01') {
          toast.error('Gagal tambah task: ' + error.message);
          return;
        }

        const newEntry = data ? {
          id: data.id,
          requestBy: data.request_by || '',
          taskName: data.task_name || '',
          status: data.status || '',
          owner: data.owner || '',
          startDate: data.start_date || '',
          finishDate: data.finish_date || '',
          notes: data.notes || ''
        } : { id: Math.max(0, ...agreementData.map(r => r.id)) + 1, ...agreementForm };

        setAgreementData(prev => [newEntry, ...prev]);
        setAgreementForm(EMPTY_AGREEMENT_FORM);
        toast.success('Task Agreement berhasil ditambahkan!');
      } catch (err) {
        const newId = Math.max(0, ...agreementData.map(r => r.id)) + 1;
        setAgreementData(prev => [{ id: newId, ...agreementForm }, ...prev]);
        setAgreementForm(EMPTY_AGREEMENT_FORM);
        toast.success('Task Agreement berhasil ditambahkan (Lokal)');
      }
    }
    setIsModalOpen(false);
    setCurrentPage(1);
  };

  // Summary Analytics for Task Management (Rekomendasi #4)
  const taskStats = React.useMemo(() => {
    let list: { status: string; company?: string }[] = [];
    if (activeCategory === 'RUPS-AR') {
      list = filteredRups;
    } else if (activeCategory === 'ASET') {
      list = filteredAset;
    } else if (activeCategory === 'AGREEMENT') {
      list = filteredAgreement;
    } else {
      list = filteredRups;
    }

    const total = list.length;
    const completed = list.filter(i => (i.status || '').toLowerCase() === 'completed').length;
    const inProgress = list.filter(i => (i.status || '').toLowerCase() === 'in progress').length;
    const notStarted = list.filter(i => (i.status || '').toLowerCase() === 'not started').length;
    const blocked = list.filter(i => (i.status || '').toLowerCase() === 'blocked').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const blockedList = list.filter(i => (i.status || '').toLowerCase() === 'blocked');

    return { total, completed, inProgress, notStarted, blocked, pct, blockedList };
  }, [activeCategory, filteredRups, filteredAset, filteredAgreement]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <PageHeader title="Tracking RUPS - AR" description="Monitoring kepatuhan RUPS Tahunan & Akta Perusahaan Grup Gesit">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCopyModalOpen(true)} 
            className="border-border/60 hover:bg-muted font-bold text-xs shadow-xs text-foreground"
          >
            <Copy className="h-4 w-4 mr-1.5" /> Salin Data ke Tahun Baru
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-[#0a2540] hover:bg-[#16375c] text-white font-bold text-xs shadow-xs">
            <Plus className="h-4 w-4 mr-1.5" /> Buat Tugas Baru
          </Button>
        </div>
      </PageHeader>

      {/* Ringkasan Analisis & KPI Tugas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Tugas RUPS</span>
            <Layers className="size-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{taskStats.total}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Kepatuhan RUPS · Periode {activePeriode}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tugas Selesai</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {taskStats.pct}%
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{taskStats.completed}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Telah diselesaikan sepenuhnya
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dalam Proses</span>
            <Clock className="size-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{taskStats.inProgress}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Sedang dikerjakan oleh PIC
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Perlu Perhatian</span>
            <AlertTriangle className={`size-4 ${taskStats.blocked > 0 ? 'text-rose-500' : 'text-amber-500'}`} />
          </div>
          <div>
            <div className={`text-2xl font-black ${taskStats.blocked > 0 ? 'text-rose-600' : 'text-foreground'}`}>
              {taskStats.blocked} <span className="text-xs font-normal text-muted-foreground">Blocked / {taskStats.notStarted} Belum Mulai</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {taskStats.blocked > 0 ? 'Terdapat tugas terkendala' : 'Tidak ada tugas yang terblokir'}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Perlu Perhatian jika ada tugas Blocked */}
      {taskStats.blockedList.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 text-rose-600 shrink-0" />
            <span className="font-semibold">
              Perlu Perhatian: Terdapat {taskStats.blockedList.length} tugas berstatus Blocked ({taskStats.blockedList.map(b => b.company).filter(Boolean).slice(0, 3).join(', ')})
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
            Perlu Tindak Lanjut
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Cari perusahaan, PIC, notaris, status RUPS..."
            className="h-9 rounded-lg border-border/60 bg-background pl-9 text-sm shadow-none"
          />
        </div>
        
        {activeCategory === 'RUPS-AR' && (
          <select
            value={activePeriode}
            onChange={async (e) => {
              const newYear = e.target.value;
              setActivePeriode(newYear);
              setCurrentPage(1);

              // Auto-populate: Jika di periode baru belum ada data, kloning seluruh daftar company dari periode sebelumnya
              const existingCompaniesInNewYear = rupsData.filter(r => (r.periode || '').toString() === newYear);
              if (existingCompaniesInNewYear.length === 0) {
                // Ambil daftar unik seluruh company dari master yang sudah pernah ada
                const allKnownCompanies = Array.from(new Set(rupsData.map(r => r.company).filter(Boolean)));
                if (allKnownCompanies.length > 0) {
                  const payload = allKnownCompanies.map(comp => ({
                    company: comp,
                    periode: newYear,
                    status: 'Not started',
                    stage: 'Drafting',
                    method: 'Sirkuler',
                    due_date: `${newYear}-06-30`,
                    reminder_emails: 'corporatesecretary@gesit.co.id',
                    notes: `Jadwal rutin periode ${newYear}`,
                    updated_by: 'System (Auto Rollover)'
                  }));
                  try {
                    const { data: inserted, error: insertErr } = await supabase.from('csl_rups_ar').insert(payload).select();
                    if (!insertErr && inserted) {
                      setRupsData(prev => [
                        ...prev,
                        ...inserted.map(d => ({
                          id: d.id,
                          company: d.company,
                          periode: d.periode,
                          status: d.status,
                          owner: '',
                          startDate: '',
                          dueDate: d.due_date || `${newYear}-06-30`,
                          finishDate: '',
                          notes: d.notes || '',
                          reminderEmails: d.reminder_emails || '',
                          method: d.method || 'Sirkuler',
                          stage: d.stage || 'Drafting',
                          updatedBy: 'System (Auto Rollover)'
                        }))
                      ]);
                      toast.success(`Daftar ${allKnownCompanies.length} perusahaan otomatis disiapkan untuk Periode ${newYear}!`);
                    }
                  } catch (e) {
                    console.error('Auto populate new year failed:', e);
                  }
                }
              }
            }}
            className="h-9 cursor-pointer rounded-lg border border-border/60 bg-background px-3 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-muted focus:ring-2 focus:ring-ring/30"
          >
            {[2024, 2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y.toString()}>Periode {y}</option>
            ))}
          </select>
        )}

        <Button variant="outline" size="sm" className="h-9 rounded-lg border-border/60 bg-background text-xs font-semibold shadow-none hover:bg-muted">
          <Filter className="mr-1.5 h-4 w-4" /> Filter
        </Button>
      </div>

      {/* Content Area */}
      {activeCategory === 'RUPS-AR' ? (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="overflow-x-auto">
          <Table className="min-w-[1050px]">
            <TableHeader className="bg-muted/60">
              <TableRow className="border-b border-border/70 hover:bg-muted/60">
                <TableHead className="h-10 w-12 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="h-10 min-w-[210px] px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perusahaan</TableHead>
                <TableHead className="h-10 w-[130px] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tahapan</TableHead>
                <TableHead className="h-10 w-[120px] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Metode</TableHead>
                <TableHead className="h-10 w-[130px] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="h-10 w-[135px] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Mulai</TableHead>
                <TableHead className="h-10 w-[135px] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Selesai</TableHead>
                <TableHead className="h-10 min-w-[170px] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Legalitas / Akta</TableHead>
                <TableHead className="h-10 w-[140px] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Diperbarui Oleh</TableHead>
                <TableHead className="h-10 w-16 px-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRups.map((item, idx) => (
                <TableRow key={item.id} className="border-b border-border/50 transition-colors hover:bg-muted/30 last:border-b-0">
                  <TableCell className="px-3 py-2.5 text-center font-mono text-xs tabular-nums text-muted-foreground">{(safePage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                  <TableCell className={`px-4 py-2.5 text-sm font-medium ${item.status === 'Blocked' ? 'text-red-500' : 'text-foreground'}`}>
                    {item.company}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <select
                      value={item.stage || 'Drafting'}
                      onChange={(e) => handleUpdateRups(item.id, 'stage', e.target.value)}
                      className="h-7 w-full cursor-pointer appearance-none rounded-md border border-border/60 bg-transparent px-2 text-left text-[11px] font-semibold outline-none transition-colors hover:bg-muted focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="Drafting" className="bg-card">1. Drafting Risalah</option>
                      <option value="Sirkuler / TTD" className="bg-card">2. Sirkuler / TTD</option>
                      <option value="Proses Notaris" className="bg-card">3. Notaris / Akta</option>
                      <option value="Pelaporan AHU" className="bg-card">4. Pelaporan AHU</option>
                      <option value="Selesai" className="bg-card">5. Selesai</option>
                    </select>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <select
                      value={item.method || 'Sirkuler'}
                      onChange={(e) => handleUpdateRups(item.id, 'method', e.target.value)}
                      className="h-7 w-full cursor-pointer appearance-none rounded-md border border-border/60 bg-transparent px-2 text-left text-[11px] font-medium outline-none transition-colors hover:bg-muted focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="Sirkuler" className="bg-card">Sirkuler</option>
                      <option value="RUPS Fisik" className="bg-card">RUPS Fisik</option>
                      <option value="Hybrid" className="bg-card">Hybrid</option>
                    </select>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <select 
                      value={item.status}
                      onChange={(e) => handleUpdateRups(item.id, 'status', e.target.value)}
                      className={`h-7 w-full cursor-pointer appearance-none rounded-md border border-transparent px-2 text-left text-[11px] font-semibold outline-none transition-colors focus:ring-2 focus:ring-ring/30 ${getStatusStyle(item.status)}`}
                    >
                      <option value="" className="bg-card">— Status —</option>
                      <option value="Completed" className="bg-card">Completed</option>
                      <option value="Not started" className="bg-card">Not started</option>
                      <option value="Blocked" className="bg-card">Blocked</option>
                      <option value="In progress" className="bg-card">In progress</option>
                    </select>
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    <DateCell
                      value={item.startDate}
                      onChange={(v) => handleUpdateRups(item.id, 'startDate', v)}
                    />
                  </TableCell>
                  <TableCell className="px-1 py-1.5">
                    <DateCell
                      value={item.finishDate}
                      onChange={(v) => handleUpdateRups(item.id, 'finishDate', v)}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <button
                      onClick={() => {
                        setSelectedRupsDetail(item);
                        setDetailModalOpen(true);
                      }}
                      className="w-full text-left rounded-md px-2 py-1 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/60 group flex flex-col"
                    >
                      {item.deedNumber ? (
                        <span className="text-[11px] font-semibold text-foreground truncate block">
                          Akta: {item.deedNumber}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic group-hover:text-foreground">
                          + Input Akta / AHU
                        </span>
                      )}
                      {item.ahuStatus && item.ahuStatus !== 'Pending' ? (
                        <span className={`text-[9px] font-bold uppercase mt-0.5 px-1 rounded w-fit ${
                          item.ahuStatus === 'Terbit SK' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40' :
                          item.ahuStatus === 'Blocked' ? 'bg-red-100 text-red-700 dark:bg-red-950/40' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/40'
                        }`}>
                          AHU: {item.ahuStatus}
                        </span>
                      ) : item.notes ? (
                        <span className="text-[10px] text-muted-foreground/70 truncate block max-w-[160px]">
                          {item.notes}
                        </span>
                      ) : null}
                    </button>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">
                        {item.updatedBy || item.owner || '—'}
                      </span>
                      {item.updatedAt && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(item.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedRupsDetail(item);
                          setDetailModalOpen(true);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                        title="Detail Akta, AHU & Dokumen"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setReminderEditTarget(item);
                          const periodYear = parseInt(item.periode || activePeriode, 10) || new Date().getFullYear();
                          // Default RUPS-AR due date: 6 bulan setelah akhir tahun buku berjalan (30 Juni)
                          const defaultDueDate = `${periodYear}-06-30`;
                          setReminderEditDueDate(item.dueDate || defaultDueDate);
                          setReminderEditEmails(item.reminderEmails || 'corporatesecretary@gesit.co.id');
                          setReminderEditOpen(true);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                        title="Reminder Jatuh Tempo & Email"
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] text-muted-foreground">
              Menampilkan {filteredRups.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRups.length)} dari <span className="font-semibold text-foreground">{filteredRups.length}</span> entri
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-7 rounded-md border border-border/60 bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-[11px] text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`h-7 w-7 rounded-md text-[11px] font-semibold transition-colors ${
                        safePage === p
                          ? 'bg-foreground text-background'
                          : 'border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-7 rounded-md border border-border/60 bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      ) : activeCategory === 'ASET' ? (
        <div className="bg-card border border-border/10 rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-[#6B4B8B] text-white">
              <TableRow className="hover:bg-[#6B4B8B]">
                <TableHead className="w-12 text-center text-white/90 font-bold">#</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Perusahaan</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Tugas</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Status</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Penanggung Jawab</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Tanggal Mulai</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Tenggat Waktu</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAset.map((item, idx) => (
                <TableRow key={item.id} className="hover:bg-muted/30 border-b border-border/40">
                  <TableCell className="text-center text-xs font-mono text-muted-foreground bg-muted/20 border-r border-border/40 py-1.5">{(safePageAset - 1) * PAGE_SIZE + idx + 1}</TableCell>
                  <TableCell className="text-sm border-r border-border/40 py-1.5 font-medium text-foreground min-w-[150px]">
                    {item.company}
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0 min-w-[200px]">
                    <input 
                      type="text" 
                      value={item.taskName}
                      onChange={(e) => handleUpdateAset(item.id, 'taskName', e.target.value)}
                      placeholder="Task name..."
                      className="w-full h-full text-xs px-3 py-2.5 bg-transparent border-none outline-none focus:bg-[#6B4B8B]/10 text-foreground"
                    />
                  </TableCell>
                  <TableCell className="border-r border-border/40 py-1.5 px-2">
                    <select 
                      value={item.status}
                      onChange={(e) => handleUpdateAset(item.id, 'status', e.target.value)}
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium border-none outline-none cursor-pointer w-full text-left appearance-none ${getStatusStyle(item.status)}`}
                    >
                      <option value="" className="bg-card"></option>
                      <option value="In progress" className="bg-card">In progress</option>
                      <option value="Completed" className="bg-card">Completed</option>
                      <option value="Not started" className="bg-card">Not started</option>
                      <option value="Blocked" className="bg-card">Blocked</option>
                    </select>
                  </TableCell>
                  <TableCell className="border-r border-border/40 py-1.5 px-2">
                    <select
                      value={item.owner}
                      onChange={(e) => handleUpdateAset(item.id, 'owner', e.target.value)}
                      className="text-[11px] px-2 py-0.5 rounded font-medium border border-border/30 outline-none cursor-pointer w-full bg-transparent text-muted-foreground hover:border-[#6B4B8B]/50 focus:border-[#6B4B8B] transition-colors min-w-[110px]"
                    >
                      <option value="">— Owner —</option>
                      {currentUser?.fullName && !userList.includes(currentUser.fullName) && (
                        <option value={currentUser.fullName}>{currentUser.fullName}</option>
                      )}
                      {userList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      {item.owner && !userList.includes(item.owner) && item.owner !== currentUser?.fullName && (
                        <option value={item.owner}>{item.owner}</option>
                      )}
                    </select>
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <DateCell
                      value={item.startDate}
                      onChange={(v) => handleUpdateAset(item.id, 'startDate', v)}
                    />
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <DateCell
                      value={item.dueDate}
                      onChange={(v) => handleUpdateAset(item.id, 'dueDate', v)}
                    />
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <input 
                      type="text" 
                      value={item.notes}
                      onChange={(e) => handleUpdateAset(item.id, 'notes', e.target.value)}
                      placeholder="Notes..."
                      className="w-full h-full text-xs px-3 py-2.5 bg-transparent border-none outline-none focus:bg-[#6B4B8B]/10 text-muted-foreground min-w-[200px]"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/10">
            <span className="text-[11px] text-muted-foreground">
              Menampilkan {filteredAset.length === 0 ? 0 : (safePageAset - 1) * PAGE_SIZE + 1}–{Math.min(safePageAset * PAGE_SIZE, filteredAset.length)} dari <span className="font-bold text-foreground">{filteredAset.length}</span> entri
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePageAset <= 1}
                className="h-7 rounded-md border border-border/60 bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPagesAset }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPagesAset || Math.abs(p - safePageAset) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-[11px] text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-7 h-7 text-[11px] font-bold rounded-lg transition-colors ${
                        safePageAset === p
                          ? 'bg-[#6B4B8B] text-white shadow-sm'
                          : 'border border-border/50 bg-card hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPagesAset, p + 1))}
                disabled={safePageAset >= totalPagesAset}
                className="h-7 rounded-md border border-border/60 bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      ) : activeCategory === 'AGREEMENT' ? (
        <div className="bg-card border border-border/10 rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-[#4A3570] text-white">
              <TableRow className="hover:bg-[#4A3570]">
                <TableHead className="w-10 text-center text-white/90 font-bold">#</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Pemohon / Pihak</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Tugas</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Status</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Penanggung Jawab</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Tanggal Mulai</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Tanggal Selesai</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAgreement.map((item, idx) => (
                <TableRow key={item.id} className="hover:bg-muted/30 border-b border-border/40">
                  <TableCell className="text-center text-xs font-mono text-muted-foreground bg-muted/20 border-r border-border/40 py-1.5">{(safePageAgreement - 1) * PAGE_SIZE + idx + 1}</TableCell>
                  <TableCell className="border-r border-border/40 p-0 min-w-[130px]">
                    <input
                      type="text"
                      value={item.requestBy}
                      onChange={(e) => handleUpdateAgreement(item.id, 'requestBy', e.target.value)}
                      placeholder="Request by..."
                      className="w-full h-full text-xs px-3 py-2.5 bg-transparent border-none outline-none focus:bg-[#4A3570]/10 text-foreground font-medium"
                    />
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0 min-w-[240px]">
                    <input
                      type="text"
                      value={item.taskName}
                      onChange={(e) => handleUpdateAgreement(item.id, 'taskName', e.target.value)}
                      placeholder="Task..."
                      className="w-full h-full text-xs px-3 py-2.5 bg-transparent border-none outline-none focus:bg-[#4A3570]/10 text-foreground"
                    />
                  </TableCell>
                  <TableCell className="border-r border-border/40 py-1.5 px-2">
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateAgreement(item.id, 'status', e.target.value)}
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium border-none outline-none cursor-pointer w-full text-left appearance-none ${getStatusStyle(item.status)}`}
                    >
                      <option value="" className="bg-card"></option>
                      <option value="In progress" className="bg-card">In progress</option>
                      <option value="Completed" className="bg-card">Completed</option>
                      <option value="Not started" className="bg-card">Not started</option>
                      <option value="Blocked" className="bg-card">Blocked</option>
                    </select>
                  </TableCell>
                  <TableCell className="border-r border-border/40 py-1.5 px-2">
                    <select
                      value={item.owner}
                      onChange={(e) => handleUpdateAgreement(item.id, 'owner', e.target.value)}
                      className="text-[11px] px-2 py-0.5 rounded font-medium border border-border/30 outline-none cursor-pointer w-full bg-transparent text-muted-foreground hover:border-[#4A3570]/50 focus:border-[#4A3570] transition-colors min-w-[110px]"
                    >
                      <option value="">— Owner —</option>
                      {currentUser?.fullName && !userList.includes(currentUser.fullName) && (
                        <option value={currentUser.fullName}>{currentUser.fullName}</option>
                      )}
                      {userList.map(name => <option key={name} value={name}>{name}</option>)}
                      {item.owner && !userList.includes(item.owner) && item.owner !== currentUser?.fullName && (
                        <option value={item.owner}>{item.owner}</option>
                      )}
                    </select>
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <DateCell value={item.startDate} onChange={(v) => handleUpdateAgreement(item.id, 'startDate', v)} />
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <DateCell value={item.finishDate} onChange={(v) => handleUpdateAgreement(item.id, 'finishDate', v)} />
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleUpdateAgreement(item.id, 'notes', e.target.value)}
                      placeholder="Notes..."
                      className="w-full h-full text-xs px-3 py-2.5 bg-transparent border-none outline-none focus:bg-[#4A3570]/10 text-muted-foreground min-w-[200px]"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/10">
            <span className="text-[11px] text-muted-foreground">
              Menampilkan {filteredAgreement.length === 0 ? 0 : (safePageAgreement - 1) * PAGE_SIZE + 1}–{Math.min(safePageAgreement * PAGE_SIZE, filteredAgreement.length)} dari <span className="font-bold text-foreground">{filteredAgreement.length}</span> entri
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePageAgreement <= 1} className="h-7 rounded-md border border-border/60 bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30">← Prev</button>
              {Array.from({ length: totalPagesAgreement }, (_, i) => i + 1).filter(p => p === 1 || p === totalPagesAgreement || Math.abs(p - safePageAgreement) <= 1).reduce<(number | '...')[]>((acc, p, i, arr) => { if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...'); acc.push(p); return acc; }, []).map((p, i) => p === '...' ? <span key={`e-${i}`} className="px-1.5 text-[11px] text-muted-foreground">…</span> : <button key={p} onClick={() => setCurrentPage(p as number)} className={`w-7 h-7 text-[11px] font-bold rounded-lg transition-colors ${safePageAgreement === p ? 'bg-[#4A3570] text-white shadow-sm' : 'border border-border/50 bg-card hover:bg-muted/50 text-muted-foreground'}`}>{p}</button>)}
              <button onClick={() => setCurrentPage(p => Math.min(totalPagesAgreement, p + 1))} disabled={safePageAgreement >= totalPagesAgreement} className="h-7 rounded-md border border-border/60 bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30">Next →</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border/10 rounded-xl p-16 text-center text-muted-foreground/50 text-xs font-bold uppercase tracking-widest shadow-sm">
          Belum ada task untuk kategori {activeCategory}.
        </div>
      )}

      {/* ── Modal Buat Task Baru ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{activeCategory}</span>
            </div>
            <DialogTitle className="text-xl font-black">Buat Task Baru</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tambahkan task baru ke kategori <span className="font-bold text-foreground">{activeCategory}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* ── RUPS-AR FORM ── */}
            {activeCategory === 'RUPS-AR' && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Company *</label>
                  <Input value={rupsForm.company} onChange={e => setRupsForm({...rupsForm, company: e.target.value})} placeholder="Nama perusahaan..." className="h-9 text-sm bg-muted/30" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Periode (Tahun)</label>
                  <Input value={(rupsForm as any).periode} onChange={e => setRupsForm({...rupsForm, periode: e.target.value})} placeholder="Mis. 2026" className="h-9 text-sm bg-muted/30" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Status</label>
                    <select value={rupsForm.status} onChange={e => setRupsForm({...rupsForm, status: e.target.value})} className="w-full h-9 text-sm border border-border/40 bg-card rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                      <option value="">— Pilih —</option>
                      <option value="Completed">Completed</option>
                      <option value="Not started">Not started</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Owner</label>
                    <select value={rupsForm.owner} onChange={e => setRupsForm({...rupsForm, owner: e.target.value})} className="w-full h-9 text-sm border border-border/40 bg-card rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                      <option value="">— Pilih Owner —</option>
                      {userList.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Start Date</label>
                    <Input type="date" value={rupsForm.startDate} onChange={e => setRupsForm({...rupsForm, startDate: e.target.value})} className="h-9 text-sm bg-muted/30" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Complete Date</label>
                    <Input type="date" value={rupsForm.finishDate} onChange={e => setRupsForm({...rupsForm, finishDate: e.target.value})} className="h-9 text-sm bg-muted/30" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Due Date (Reminder)</label>
                    <Input type="date" value={(rupsForm as any).dueDate || ''} onChange={e => setRupsForm({...rupsForm, dueDate: e.target.value} as any)} className="h-9 text-sm bg-muted/30" />
                    <p className="text-[9px] text-muted-foreground mt-1">Email reminder dikirim 1 minggu sebelum due date</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Email Reminder</label>
                    <Input
                      value={(rupsForm as any).reminderEmails || ''}
                      onChange={e => setRupsForm({...rupsForm, reminderEmails: e.target.value} as any)}
                      placeholder="email1@test.com, email2@test.com"
                      className="h-9 text-sm bg-muted/30"
                    />
                    <p className="text-[9px] text-muted-foreground mt-1">Pisahkan dengan koma untuk banyak email</p>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Notes</label>
                  <textarea rows={2} value={rupsForm.notes} onChange={e => setRupsForm({...rupsForm, notes: e.target.value})} placeholder="Catatan tambahan..." className="w-full p-2 text-sm bg-muted/30 border border-border/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            )}

            {/* ── ASET FORM ── */}
            {activeCategory === 'ASET' && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Company Name *</label>
                  <Input value={asetForm.company} onChange={e => setAsetForm({...asetForm, company: e.target.value})} placeholder="Nama perusahaan/entitas..." className="h-9 text-sm bg-muted/30" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Task / Nama Pekerjaan *</label>
                  <textarea rows={2} value={asetForm.taskName} onChange={e => setAsetForm({...asetForm, taskName: e.target.value})} placeholder="Deskripsi singkat task aset..." className="w-full p-2 text-sm bg-muted/30 border border-border/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#6B4B8B]/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Status</label>
                    <select value={asetForm.status} onChange={e => setAsetForm({...asetForm, status: e.target.value})} className="w-full h-9 text-sm border border-border/40 bg-card rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#6B4B8B]/30">
                      <option value="">— Pilih —</option>
                      <option value="In progress">In progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Not started">Not started</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Owner</label>
                    <select value={asetForm.owner} onChange={e => setAsetForm({...asetForm, owner: e.target.value})} className="w-full h-9 text-sm border border-border/40 bg-card rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#6B4B8B]/30">
                      <option value="">— Pilih Owner —</option>
                      {userList.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Start Date</label>
                    <Input type="date" value={asetForm.startDate} onChange={e => setAsetForm({...asetForm, startDate: e.target.value})} className="h-9 text-sm bg-muted/30" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Due Date</label>
                    <Input type="date" value={asetForm.dueDate} onChange={e => setAsetForm({...asetForm, dueDate: e.target.value})} className="h-9 text-sm bg-muted/30" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Notes</label>
                  <textarea rows={2} value={asetForm.notes} onChange={e => setAsetForm({...asetForm, notes: e.target.value})} placeholder="Catatan, update terkini..." className="w-full p-2 text-sm bg-muted/30 border border-border/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#6B4B8B]/50" />
                </div>
              </>
            )}

            {/* ── AGREEMENT FORM ── */}
            {activeCategory === 'AGREEMENT' && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Request by/for *</label>
                  <Input value={agreementForm.requestBy} onChange={e => setAgreementForm({...agreementForm, requestBy: e.target.value})} placeholder="Nama pemohon atau untuk siapa..." className="h-9 text-sm bg-muted/30" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Task / Nama Perjanjian *</label>
                  <textarea rows={2} value={agreementForm.taskName} onChange={e => setAgreementForm({...agreementForm, taskName: e.target.value})} placeholder="Nama agreement atau perjanjian..." className="w-full p-2 text-sm bg-muted/30 border border-border/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#4A3570]/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Status</label>
                    <select value={agreementForm.status} onChange={e => setAgreementForm({...agreementForm, status: e.target.value})} className="w-full h-9 text-sm border border-border/40 bg-card rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#4A3570]/30">
                      <option value="">— Pilih —</option>
                      <option value="In progress">In progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Not started">Not started</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Owner</label>
                    <select value={agreementForm.owner} onChange={e => setAgreementForm({...agreementForm, owner: e.target.value})} className="w-full h-9 text-sm border border-border/40 bg-card rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#4A3570]/30">
                      <option value="">— Pilih Owner —</option>
                      {userList.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Start Date</label>
                    <Input type="date" value={agreementForm.startDate} onChange={e => setAgreementForm({...agreementForm, startDate: e.target.value})} className="h-9 text-sm bg-muted/30" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Finish Date</label>
                    <Input type="date" value={agreementForm.finishDate} onChange={e => setAgreementForm({...agreementForm, finishDate: e.target.value})} className="h-9 text-sm bg-muted/30" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Notes</label>
                  <textarea rows={2} value={agreementForm.notes} onChange={e => setAgreementForm({...agreementForm, notes: e.target.value})} placeholder="Catatan atau update terkini..." className="w-full p-2 text-sm bg-muted/30 border border-border/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#4A3570]/50" />
                </div>
              </>
            )}

            {/* ── Other categories placeholder ── */}
            {activeCategory !== 'RUPS-AR' && activeCategory !== 'ASET' && activeCategory !== 'AGREEMENT' && (
              <div className="py-8 text-center text-muted-foreground/50 text-xs font-bold uppercase tracking-widest">
                Form untuk kategori <span className="text-foreground">{activeCategory}</span> belum tersedia.
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10 gap-2 flex sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs font-bold rounded-xl h-9">
              Batal
            </Button>
            {(activeCategory === 'RUPS-AR' || activeCategory === 'ASET' || activeCategory === 'AGREEMENT') && (
              <Button size="sm" onClick={handleAddTask} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                <Plus className="h-4 w-4 mr-1.5" /> Tambah Task
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Detail Akta & AHU Legal RUPS ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              Legalitas RUPS-AR
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedRupsDetail?.company} • Periode {selectedRupsDetail?.periode || activePeriode}
            </DialogDescription>
          </DialogHeader>
          {selectedRupsDetail && (
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Tahapan Workflow</label>
                  <select
                    value={selectedRupsDetail.stage || 'Drafting'}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedRupsDetail(prev => prev ? { ...prev, stage: v } : null);
                      handleUpdateRups(selectedRupsDetail.id, 'stage', v);
                    }}
                    className="h-9 w-full rounded-lg border border-border/60 bg-muted/30 px-3 text-xs font-semibold outline-none"
                  >
                    <option value="Drafting">1. Drafting Risalah / Sirkuler</option>
                    <option value="Sirkuler / TTD">2. Proses Tanda Tangan Pemegang Saham</option>
                    <option value="Proses Notaris">3. Proses Notaris (Akta)</option>
                    <option value="Pelaporan AHU">4. Pelaporan AHU Kemenkumham</option>
                    <option value="Selesai">5. Selesai (Completed)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Metode RUPS</label>
                  <select
                    value={selectedRupsDetail.method || 'Sirkuler'}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedRupsDetail(prev => prev ? { ...prev, method: v } : null);
                      handleUpdateRups(selectedRupsDetail.id, 'method', v);
                    }}
                    className="h-9 w-full rounded-lg border border-border/60 bg-muted/30 px-3 text-xs font-semibold outline-none"
                  >
                    <option value="Sirkuler">Keputusan Sirkuler</option>
                    <option value="RUPS Fisik">RUPS Fisik</option>
                    <option value="Hybrid">Hybrid (Online & Fisik)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-2.5">Data Notaris & Akta</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Nama Notaris</label>
                    <Input
                      value={selectedRupsDetail.notaryName || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedRupsDetail(prev => prev ? { ...prev, notaryName: v } : null);
                        handleUpdateRups(selectedRupsDetail.id, 'notaryName', v);
                      }}
                      placeholder="Contoh: Notaris Ashoya Ratam, S.H., M.Kn."
                      className="h-9 text-xs bg-muted/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Nomor Akta</label>
                      <Input
                        value={selectedRupsDetail.deedNumber || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedRupsDetail(prev => prev ? { ...prev, deedNumber: v } : null);
                          handleUpdateRups(selectedRupsDetail.id, 'deedNumber', v);
                        }}
                        placeholder="Contoh: 15"
                        className="h-9 text-xs bg-muted/30 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Tanggal Akta</label>
                      <Input
                        type="date"
                        value={selectedRupsDetail.deedDate || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedRupsDetail(prev => prev ? { ...prev, deedDate: v } : null);
                          handleUpdateRups(selectedRupsDetail.id, 'deedDate', v);
                        }}
                        className="h-9 text-xs bg-muted/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-2.5">Penerimaan / SK AHU Kemenkumham</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Nomor SK / Bukti AHU</label>
                    <Input
                      value={selectedRupsDetail.ahuNumber || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedRupsDetail(prev => prev ? { ...prev, ahuNumber: v } : null);
                        handleUpdateRups(selectedRupsDetail.id, 'ahuNumber', v);
                      }}
                      placeholder="AHU-0012345.AH.01.02.TAHUN 2026"
                      className="h-9 text-xs bg-muted/30 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Status AHU</label>
                    <select
                      value={selectedRupsDetail.ahuStatus || 'Pending'}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedRupsDetail(prev => prev ? { ...prev, ahuStatus: v } : null);
                        handleUpdateRups(selectedRupsDetail.id, 'ahuStatus', v);
                      }}
                      className="h-9 w-full rounded-lg border border-border/60 bg-muted/30 px-2 text-xs font-bold outline-none"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Diajukan">Diajukan</option>
                      <option value="Terbit SK">Terbit SK</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Dokumen RUPS / Akta (Google Drive)</h4>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadRupsDoc(f);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isUploadingDoc}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs font-bold rounded-lg border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
                  >
                    {isUploadingDoc ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload File
                      </>
                    )}
                  </Button>
                </div>

                {selectedRupsDetail.documentUrl ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate max-w-[280px]">
                        {selectedRupsDetail.documentName || 'Dokumen RUPS (Google Drive)'}
                      </span>
                    </div>
                    <a
                      href={selectedRupsDetail.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-500 shrink-0 ml-2"
                    >
                      Buka Drive <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">
                    Belum ada dokumen yang diunggah. Klik upload untuk menyimpan arsip PDF ke Google Drive.
                  </p>
                )}
              </div>

              <div className="border-t border-border/40 pt-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Catatan Tambahan / Kendala</label>
                <textarea
                  value={selectedRupsDetail.notes || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedRupsDetail(prev => prev ? { ...prev, notes: v } : null);
                    handleUpdateRups(selectedRupsDetail.id, 'notes', v);
                  }}
                  rows={2}
                  placeholder="Catatan progres, kendala tanda tangan, atau riwayat pemblokiran..."
                  className="w-full rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs outline-none focus:border-border resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="p-4 border-t bg-muted/10">
            <Button size="sm" onClick={() => setDetailModalOpen(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-6 ml-auto">
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Edit Email & Reminder ── */}
      <Dialog open={reminderEditOpen} onOpenChange={setReminderEditOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-lg font-black">Edit Email & Reminder</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {reminderEditTarget?.company}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Due Date (Reminder)</label>
                <button
                  type="button"
                  onClick={() => {
                    const periodYear = parseInt(reminderEditTarget?.periode || activePeriode, 10) || new Date().getFullYear();
                    setReminderEditDueDate(`${periodYear}-06-30`);
                  }}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Set 30 Juni (Default UU PT)
                </button>
              </div>
              <Input
                type="date"
                value={reminderEditDueDate}
                onChange={(e) => setReminderEditDueDate(e.target.value)}
                className="h-9 text-sm bg-muted/30"
              />
              <p className="text-[9px] text-muted-foreground mt-1">Default 6 bulan dari penutupan buku (30 Juni). Email reminder otomatis dikirim 1 minggu sebelum due date.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Email Reminder</label>
                <button
                  type="button"
                  onClick={() => setReminderEditEmails('corporatesecretary@gesit.co.id')}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Gunakan Grup CSL
                </button>
              </div>
              <Input
                value={reminderEditEmails}
                onChange={(e) => setReminderEditEmails(e.target.value)}
                placeholder="corporatesecretary@gesit.co.id"
                className="h-9 text-sm bg-muted/30"
              />
              <p className="text-[9px] text-muted-foreground mt-1">Pisahkan dengan koma untuk banyak email (default: corporatesecretary@gesit.co.id)</p>
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-muted/10 gap-2 flex sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setReminderEditOpen(false)} className="text-xs font-bold rounded-xl h-9">
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveReminderEdit} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Salin Data Periode ── */}
      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-gradient-to-br from-muted/50 to-background">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                <Copy className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Salin Data RUPS ke Tahun Baru
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Duplikasi seluruh daftar PT dari tahun sebelumnya tanpa perlu input ulang nama PT satu per satu.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Dari Tahun (Sumber)
                </label>
                <select
                  value={sourceYear}
                  onChange={(e) => setSourceYear(e.target.value)}
                  className="w-full h-9 text-xs font-semibold border border-border/60 bg-background rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y.toString()}>
                      Periode {y} ({rupsData.filter(r => (r.periode || '').toString() === y.toString()).length} PT)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Ke Tahun (Tujuan)
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  className="w-full h-9 text-xs font-semibold border border-border/60 bg-background rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {[2025, 2026, 2027, 2028, 2029].map(y => (
                    <option key={y} value={y.toString()}>Periode {y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Pengaturan Duplikasi:
              </p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepOwner}
                  onChange={(e) => setKeepOwner(e.target.checked)}
                  className="rounded border-border/60 text-blue-600 focus:ring-blue-500"
                />
                Pertahankan PIC / Owner dari tahun sebelumnya
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepMethod}
                  onChange={(e) => setKeepMethod(e.target.checked)}
                  className="rounded border-border/60 text-blue-600 focus:ring-blue-500"
                />
                Pertahankan Metode RUPS (Sirkuler / Fisik)
              </label>
            </div>

            <div className="text-[11px] text-muted-foreground bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50 p-2.5 rounded-lg flex gap-2">
              <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Status seluruh tugas di tahun baru otomatis diatur ke <b>Not started (Drafting)</b> dengan batas jatuh tempo <b>30 Juni {targetYear}</b>. Berkas akta lama tidak akan terbawa.
              </span>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/40 bg-muted/20 gap-2 flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCopyModalOpen(false)}
              disabled={isCopyingYear}
              className="text-xs font-semibold rounded-lg h-9"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleBatchCopyYear}
              disabled={isCopyingYear}
              className="bg-[#0a2540] hover:bg-[#16375c] text-white text-xs font-bold rounded-lg h-9 px-4 gap-1.5"
            >
              {isCopyingYear ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyalin...
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Salin Data ke {targetYear}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
