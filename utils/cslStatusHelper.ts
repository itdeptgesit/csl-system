export interface StatusConfig {
  label: string;
  className: string;
  dotColor: string;
}

/**
 * Standardize status colors and labels across all CSL-LINK modules
 * Follows design-csl-link.md & analisa.md (one status = one consistent color)
 */
export function getUnifiedStatusBadge(statusRaw: string): StatusConfig {
  const s = (statusRaw || '').toUpperCase().trim();

  // 1. COMPLETED / APPROVED / SELESAI / DONE / CLOSED -> EMERALD (Green)
  if (
    s.includes('COMPLETED') ||
    s.includes('APPROVED') ||
    s.includes('DISBURSED') ||
    s.includes('SELESAI') ||
    s.includes('DONE') ||
    s.includes('CLOSED')
  ) {
    let lbl = statusRaw;
    if (s === 'COMPLETED' || s === 'CLOSED') lbl = 'Selesai';
    else if (s === 'APPROVED') lbl = 'Disetujui';
    else if (s === 'DISBURSED') lbl = 'Dicairkan';
    else if (s.includes('COMPLETED ON TIME')) lbl = 'Selesai Tepat Waktu';
    else if (s.includes('COMPLETED LATE')) lbl = 'Selesai Terlambat';

    return {
      label: lbl,
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-semibold',
      dotColor: 'bg-emerald-500',
    };
  }

  // 2. IN PROGRESS / PROCESSING / DIPROSES / REVIEW -> BLUE
  if (
    s.includes('PROCESSING') ||
    s.includes('IN PROGRESS') ||
    s.includes('DIPROSES') ||
    s.includes('REVIEW') ||
    s.includes('RESPONDED')
  ) {
    let lbl = statusRaw;
    if (s === 'PROCESSING' || s === 'DIPROSES') lbl = 'Diproses';
    else if (s === 'IN PROGRESS') lbl = 'Sedang Dikerjakan';
    else if (s === 'REVIEW_USER' || s.includes('REVIEW')) lbl = 'Review Pemohon';

    return {
      label: lbl,
      className: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 font-medium',
      dotColor: 'bg-blue-500',
    };
  }

  // 3. PENDING / SUBMITTED / DIAJUKAN / NOT STARTED / MENUNGGU -> AMBER (Yellow)
  if (
    s.includes('SUBMITTED') ||
    s.includes('PENDING') ||
    s.includes('DIAJUKAN') ||
    s.includes('NOT STARTED') ||
    s.includes('DRAFT') ||
    s.includes('DUE SOON') ||
    s.includes('DUE TODAY')
  ) {
    let lbl = statusRaw;
    if (s === 'SUBMITTED' || s === 'DIAJUKAN') lbl = 'Diajukan';
    else if (s === 'NOT STARTED') lbl = 'Belum Dimulai';
    else if (s === 'PENDING') lbl = 'Menunggu';
    else if (s === 'DRAFT') lbl = 'Draf';
    else if (s.includes('DUE SOON')) lbl = 'Mendekati Tenggat';
    else if (s.includes('DUE TODAY')) lbl = 'Jatuh Tempo Hari Ini';

    return {
      label: lbl,
      className: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-medium',
      dotColor: 'bg-amber-500',
    };
  }

  // 4. BLOCKED / OVERDUE / REJECTED / DITOLAK / TERKENDALA -> ROSE (Red)
  if (
    s.includes('BLOCKED') ||
    s.includes('OVERDUE') ||
    s.includes('REJECTED') ||
    s.includes('DITOLAK') ||
    s.includes('TERKENDALA') ||
    s.includes('ISSUES') ||
    s.includes('SANCTION') ||
    s.includes('SANKSI')
  ) {
    let lbl = statusRaw;
    if (s === 'BLOCKED' || s === 'TERKENDALA') lbl = 'Terkendala';
    else if (s === 'OVERDUE') lbl = 'Lewat Tenggat';
    else if (s === 'REJECTED' || s === 'DITOLAK') lbl = 'Ditolak';

    return {
      label: lbl,
      className: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 font-semibold',
      dotColor: 'bg-rose-500',
    };
  }

  // 5. DEFAULT / OTHERS -> SLATE (Gray)
  return {
    label: statusRaw || 'Belum Ditentukan',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium',
    dotColor: 'bg-slate-400',
  };
}

/**
 * Universal Indonesian Date Formatter per design.md §14.2:
 * Pattern: `5 Okt 2026` (Day without leading zero, Indonesian abbreviated month)
 */
export function formatCslDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = d.getDate(); // No leading zero
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Universal Indonesian Currency & Valas Formatter per design.md §14.3:
 * Thousands dot separator (`145.350.710`).
 * Uang selalu diawali `Rp ` untuk IDR.
 * Valuta asing: `HKD 1.460 (≈ Rp 3.354.599)`.
 */
export function formatCslCurrency(amount: number, currency: string = 'IDR', idrEquivalent?: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
  const isIdr = !currency || currency.toUpperCase() === 'IDR';

  // Format IDR with dot as thousand separator
  const formattedIdr = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  if (isIdr) {
    return formattedIdr(amount);
  }

  // Foreign currency
  const currCode = currency.toUpperCase();
  const formattedForeign = `${currCode} ` + Math.round(amount).toLocaleString('id-ID');
  if (idrEquivalent !== undefined && idrEquivalent !== null && idrEquivalent > 0) {
    return `${formattedForeign} (≈ ${formattedIdr(idrEquivalent)})`;
  }
  return formattedForeign;
}

/**
 * Universal Indonesian Number & Percentage Formatter per design.md §14.3:
 * Thousands dot separator, decimal comma (`3,5%`).
 */
export function formatCslNumber(num: number, decimals: number = 0): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Universal Range Formatter per design.md §14.2:
 * E.g. `1–10 dari 69 entri`
 */
export function formatCslRange(start: number, end: number, total: number): string {
  return `${start}–${end} dari ${total} entri`;
}

