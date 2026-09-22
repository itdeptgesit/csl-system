import React, { useState, useRef, useEffect } from 'react';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, Search, Filter, CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

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

// Helper: ISO → M/D/YYYY display
function toDisplay(val: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${parseInt(m)}/${parseInt(d)}/${y}`;
  }
  return val;
}

// DateCell: shows M/D/YYYY text + calendar icon; click icon opens native date picker
const DateCell: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'm/d/yyyy' }) => {
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
    <div className="relative flex items-center group w-full h-full min-w-[110px]">
      {/* Visible text input for manual entry */}
      <input
        type="text"
        value={displayValue}
        onChange={handleManualChange}
        onBlur={handleManualBlur}
        placeholder={placeholder}
        className="w-full text-xs text-foreground px-3 py-2.5 bg-transparent border-none outline-none focus:bg-indigo-50/50 pr-7"
      />
      {/* Calendar icon to open hidden date input */}
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
        className="absolute right-1.5 text-muted-foreground/50 hover:text-indigo-500 transition-colors"
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

const DUMMY_RUPS_AR = [
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
    case 'Completed': return 'bg-emerald-200 text-emerald-800';
    case 'Not started': return 'bg-blue-200 text-blue-800';
    case 'Blocked': return 'bg-red-300 text-red-900';
    case 'In progress': return 'bg-yellow-200 text-yellow-800';
    default: return 'bg-gray-100 text-gray-500';
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

const EMPTY_RUPS_FORM = { company: '', periode: new Date().getFullYear().toString(), status: '', owner: '', startDate: '', finishDate: '', notes: '' };
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
          finishDate: d.finish_date || '',
          notes: d.notes || ''
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
    const dbField = field === 'startDate' ? 'start_date' : field === 'dueDate' ? 'due_date' : field === 'finishDate' ? 'finish_date' : field;
    const isDateField = dbField.endsWith('_date');
    const dbValue = isDateField ? (toISO(value) || null) : value;
    const isText = field === 'notes';
    const delay = isText ? 700 : 150;
    
    saveTimeoutRef.current[`${id}-${field}`] = setTimeout(async () => {
      try {
        const { data, error } = await supabase.from('csl_rups_ar').update({ [dbField]: dbValue }).eq('id', id).select();
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

  const handleUpdateRups = (id: number, field: string, value: string) => {
    setRupsData(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
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
      
      const payload = {
        company: rupsForm.company,
        periode: (rupsForm as any).periode || new Date().getFullYear().toString(),
        status: rupsForm.status,
        owner: rupsForm.owner,
        start_date: toISO(rupsForm.startDate) || null,
        finish_date: toISO(rupsForm.finishDate) || null,
        notes: rupsForm.notes
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
          finishDate: data.finish_date || '',
          notes: data.notes || ''
        } : { id: Math.max(0, ...rupsData.map(r => r.id)) + 1, ...rupsForm };

        setRupsData(prev => [newEntry, ...prev]);
        setRupsForm(EMPTY_RUPS_FORM);
        toast.success('Task RUPS-AR berhasil ditambahkan!');
      } catch (err) {
        // Local fallback
        const newId = Math.max(0, ...rupsData.map(r => r.id)) + 1;
        setRupsData(prev => [{ id: newId, ...rupsForm }, ...prev]);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <PageHeader title="Task Management" description="Kelola berbagai aktivitas dan tugas CSL">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
            <Plus className="h-4 w-4 mr-1.5" /> Buat Task Baru
          </Button>
        </div>
      </PageHeader>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-border/40">
        {TASK_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`whitespace-nowrap px-4 py-3 text-xs font-bold transition-all border-b-2 ${
              activeCategory === cat
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={`Cari task di kategori ${activeCategory}...`}
            className="pl-9 h-9 text-sm rounded-xl bg-muted/30"
          />
        </div>
        
        {activeCategory === 'RUPS-AR' && (
          <select
            value={activePeriode}
            onChange={e => {
              setActivePeriode(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3 outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
          >
            {[2024, 2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y.toString()}>Periode {y}</option>
            ))}
          </select>
        )}

        <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold bg-card border-border/40">
          <Filter className="h-4 w-4 mr-1.5" /> Filter
        </Button>
      </div>

      {/* Content Area */}
      {activeCategory === 'RUPS-AR' ? (
        <div className="bg-card border border-border/10 rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-indigo-900 text-white">
              <TableRow className="hover:bg-indigo-900">
                <TableHead className="w-12 text-center text-indigo-100 font-bold">#</TableHead>
                <TableHead className="text-indigo-100 font-bold border-l border-indigo-700/50">Company</TableHead>
                <TableHead className="text-indigo-100 font-bold border-l border-indigo-700/50">Status</TableHead>
                <TableHead className="text-indigo-100 font-bold border-l border-indigo-700/50">Owner</TableHead>
                <TableHead className="text-indigo-100 font-bold border-l border-indigo-700/50">Start date</TableHead>
                <TableHead className="text-indigo-100 font-bold border-l border-indigo-700/50">Complete date</TableHead>
                <TableHead className="text-indigo-100 font-bold border-l border-indigo-700/50">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRups.map((item, idx) => (
                <TableRow key={item.id} className="hover:bg-muted/30 border-b border-border/40">
                  <TableCell className="text-center text-xs font-mono text-muted-foreground bg-muted/20 border-r border-border/40 py-1.5">{(safePage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                  <TableCell className={`text-sm border-r border-border/40 py-1.5 font-medium ${item.status === 'Blocked' ? 'text-red-500 font-medium' : 'text-foreground'}`}>
                    {item.company}
                  </TableCell>
                  <TableCell className="border-r border-border/40 py-1.5 px-2">
                    <select 
                      value={item.status}
                      onChange={(e) => handleUpdateRups(item.id, 'status', e.target.value)}
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium border-none outline-none cursor-pointer w-full text-left appearance-none ${getStatusStyle(item.status)}`}
                    >
                      <option value="" className="bg-white text-black">— Status —</option>
                      <option value="Completed" className="bg-white text-black">Completed</option>
                      <option value="Not started" className="bg-white text-black">Not started</option>
                      <option value="Blocked" className="bg-white text-black">Blocked</option>
                      <option value="In progress" className="bg-white text-black">In progress</option>
                    </select>
                  </TableCell>
                  <TableCell className="border-r border-border/40 py-1.5 px-2">
                    <select
                      value={item.owner}
                      onChange={(e) => handleUpdateRups(item.id, 'owner', e.target.value)}
                      className="text-[11px] px-2 py-0.5 rounded font-medium border border-border/30 outline-none cursor-pointer w-full bg-transparent text-muted-foreground hover:border-indigo-400 focus:border-indigo-500 transition-colors min-w-[110px]"
                    >
                      <option value="">— Pilih Owner —</option>
                      {/* Current user on top if not in list */}
                      {currentUser?.fullName && !userList.includes(currentUser.fullName) && (
                        <option value={currentUser.fullName}>{currentUser.fullName}</option>
                      )}
                      {userList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      {/* Fallback: preserve existing owner values not in fetched list */}
                      {item.owner && !userList.includes(item.owner) && item.owner !== currentUser?.fullName && (
                        <option value={item.owner}>{item.owner}</option>
                      )}
                    </select>
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <DateCell
                      value={item.startDate}
                      onChange={(v) => handleUpdateRups(item.id, 'startDate', v)}
                    />
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <DateCell
                      value={item.finishDate}
                      onChange={(v) => handleUpdateRups(item.id, 'finishDate', v)}
                    />
                  </TableCell>
                  <TableCell className="border-r border-border/40 p-0">
                    <input 
                      type="text" 
                      value={item.notes}
                      onChange={(e) => handleUpdateRups(item.id, 'notes', e.target.value)}
                      placeholder="Notes..."
                      className={`w-full h-full text-xs px-3 py-2.5 bg-transparent border-none outline-none focus:bg-indigo-50/50 min-w-[140px] ${item.status === 'Blocked' ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/10">
            <span className="text-[11px] text-muted-foreground">
              Menampilkan {filteredRups.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRups.length)} dari <span className="font-bold text-foreground">{filteredRups.length}</span> entri
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1 text-[11px] font-bold rounded-lg border border-border/50 bg-card hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                      className={`w-7 h-7 text-[11px] font-bold rounded-lg transition-colors ${
                        safePage === p
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'border border-border/50 bg-card hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1 text-[11px] font-bold rounded-lg border border-border/50 bg-card hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                <TableHead className="text-white/90 font-bold border-l border-white/20">Company Name</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Task</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Status</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Owner</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Start date</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Due date</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Notes</TableHead>
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
                      <option value="" className="bg-white text-black"></option>
                      <option value="In progress" className="bg-white text-black">In progress</option>
                      <option value="Completed" className="bg-white text-black">Completed</option>
                      <option value="Not started" className="bg-white text-black">Not started</option>
                      <option value="Blocked" className="bg-white text-black">Blocked</option>
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
                className="px-3 py-1 text-[11px] font-bold rounded-lg border border-border/50 bg-card hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                className="px-3 py-1 text-[11px] font-bold rounded-lg border border-border/50 bg-card hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                <TableHead className="text-white/90 font-bold border-l border-white/20">Request by/for</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Task</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Status</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Owner</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Start date</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Finish date</TableHead>
                <TableHead className="text-white/90 font-bold border-l border-white/20">Notes</TableHead>
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
                      <option value="" className="bg-white text-black"></option>
                      <option value="In progress" className="bg-white text-black">In progress</option>
                      <option value="Completed" className="bg-white text-black">Completed</option>
                      <option value="Not started" className="bg-white text-black">Not started</option>
                      <option value="Blocked" className="bg-white text-black">Blocked</option>
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
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePageAgreement <= 1} className="px-3 py-1 text-[11px] font-bold rounded-lg border border-border/50 bg-card hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← Prev</button>
              {Array.from({ length: totalPagesAgreement }, (_, i) => i + 1).filter(p => p === 1 || p === totalPagesAgreement || Math.abs(p - safePageAgreement) <= 1).reduce<(number | '...')[]>((acc, p, i, arr) => { if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...'); acc.push(p); return acc; }, []).map((p, i) => p === '...' ? <span key={`e-${i}`} className="px-1.5 text-[11px] text-muted-foreground">…</span> : <button key={p} onClick={() => setCurrentPage(p as number)} className={`w-7 h-7 text-[11px] font-bold rounded-lg transition-colors ${safePageAgreement === p ? 'bg-[#4A3570] text-white shadow-sm' : 'border border-border/50 bg-card hover:bg-muted/50 text-muted-foreground'}`}>{p}</button>)}
              <button onClick={() => setCurrentPage(p => Math.min(totalPagesAgreement, p + 1))} disabled={safePageAgreement >= totalPagesAgreement} className="px-3 py-1 text-[11px] font-bold rounded-lg border border-border/50 bg-card hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next →</button>
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
    </div>
  );
};
