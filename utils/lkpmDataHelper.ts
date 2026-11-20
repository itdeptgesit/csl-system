import rawData from './lkpm_data.json';

export interface LkpmUnit {
  id: string;
  tahun: number;
  perusahaan: string;
  grup: string;
  kegiatan: string;
  kbli: string;
  nku: string;
  kategori_khusus: string | null;
  sanksi: boolean;
  pic_fa: string;
  pic_csl: string;
  karyawan?: string;
  notes: string;
  document: string;
  status: {
    tw1: 'Lapor' | 'Belum' | null;
    tw2: 'Lapor' | 'Belum' | null;
    tw3: 'Lapor' | 'Belum' | null;
    tw4: 'Lapor' | 'Belum' | null;
  };
}

export interface LkpmCompany {
  nama: string;
  grup: string;
  kegiatan: string;
}

export interface YearData {
  perusahaan: LkpmCompany[];
  unit: LkpmUnit[];
}

export interface LkpmStoreData {
  '2026': YearData;
  '2025': YearData;
}

export const INITIAL_LKPM_STORE: LkpmStoreData = rawData as LkpmStoreData;

export function getDerivedStatus(unit: LkpmUnit, quarter: 'tw1' | 'tw2' | 'tw3' | 'tw4', lang: string = 'id') {
  const isEn = lang === 'en';
  const qVal = unit.status[quarter];

  if (unit.sanksi) {
    return { label: isEn ? 'Sanctioned' : 'Sanksi', color: 'red', cat: 'sanksi' };
  }
  if (unit.kategori_khusus === 'Tidak Wajib (Mikro)') {
    return { label: isEn ? 'Exempt' : 'Tidak Wajib', color: 'grey', cat: 'khusus' };
  }
  if (unit.kategori_khusus === 'Handover' && quarter !== 'tw1') {
    return { label: 'Handover', color: 'grey', cat: 'khusus' };
  }
  if (unit.kategori_khusus === 'Per-Semester' && (quarter === 'tw1' || quarter === 'tw3')) {
    return { label: isEn ? 'Semi-Annual' : 'Per-Semester', color: 'blue', cat: 'khusus' };
  }

  if (qVal === 'Lapor') {
    const hasSnk = Boolean(unit.document && unit.document.toUpperCase().includes('SNK'));
    if (!hasSnk && quarter === 'tw3' && unit.tahun === 2026) {
      return { label: isEn ? 'Missing Proof' : 'Bukti Kurang', color: 'amber', cat: 'bukti' };
    }
    return { label: isEn ? 'Reported' : 'Terlapor', color: 'green', cat: 'terlapor' };
  }

  if (qVal === 'Belum') {
    return { label: isEn ? 'Not Reported' : 'Belum Lapor', color: 'red', cat: 'belum' };
  }

  // Null cases
  if (unit.notes && unit.notes.toLowerCase().includes('cek')) {
    return { label: isEn ? 'Needs Check' : 'Perlu Cek', color: 'amber', cat: 'cek' };
  }

  if (unit.kategori_khusus === 'Per-Semester') {
    return { label: isEn ? 'Semi-Annual' : 'Per-Semester', color: 'blue', cat: 'khusus' };
  }

  return { label: isEn ? 'No Record' : 'Belum Ada Catatan', color: 'grey', cat: 'khusus' };
}

export function getQuarterDocNote(unit: LkpmUnit, quarter: 'tw1' | 'tw2' | 'tw3' | 'tw4', lang: string = 'id') {
  const isEn = lang === 'en';

  if (unit.kategori_khusus === 'Tidak Wajib (Mikro)') {
    return isEn ? 'Exempt from reporting' : 'Tidak wajib lapor';
  }
  if (unit.kategori_khusus === 'Handover') {
    return quarter === 'tw1' ? (isEn ? 'Reported' : 'Terlapor') : (isEn ? 'Handed over to PM' : 'Handover ke PM');
  }
  if (unit.kategori_khusus === 'Per-Semester') {
    if (quarter === 'tw1' || quarter === 'tw3') return isEn ? 'Off-cycle (semi-annual)' : 'Bukan jadwal (semester)';
    if (quarter === 'tw2') return isEn ? 'Reported - Semester I' : 'Terlapor - semester I';
    return isEn ? 'Reported in Semester II' : 'Terlapor di semester II';
  }

  if (unit.tahun === 2026 && quarter === 'tw4') {
    return unit.document ? unit.document : (isEn ? 'In progress - deadline January 2027' : 'Periode berjalan - batas lapor Januari 2027');
  }

  if (unit.tahun === 2026 && quarter === 'tw3') {
    if (unit.status.tw3 === 'Lapor') {
      if (unit.document && unit.document.toUpperCase().includes('SNK')) {
        return unit.document;
      }
      return isEn ? 'Reported - SNK number pending' : 'Terlapor - nomor SNK belum dicatat';
    }
    if (unit.status.tw3 === 'Belum') {
      return unit.notes ? `${isEn ? 'Not reported' : 'Belum lapor'} (${unit.notes})` : (isEn ? 'Not reported' : 'Belum lapor');
    }
  }

  if (unit.status[quarter] === 'Lapor') {
    return unit.document ? unit.document : (isEn ? 'Reported' : 'Terlapor');
  }
  if (unit.status[quarter] === 'Belum') {
    return unit.notes ? `${isEn ? 'Not reported' : 'Belum lapor'} (${unit.notes})` : (isEn ? 'Not reported' : 'Belum lapor');
  }

  return isEn ? 'No record' : 'Belum ada catatan';
}
