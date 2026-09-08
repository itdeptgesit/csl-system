import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabaseClient';

export interface OffshoreInvoiceData {
  id: string;
  invoice_number: string;
  voucher_number?: string;
  company: string;
  paid_to: string;
  payment_method: string;
  account_code?: string;
  payment_description: string;
  payment_fee_note?: string;
  foreign_currency: string;
  foreign_amount: number;
  bank_name: string;
  account_name: string;
  bank_code?: string;
  swift_code?: string;
  account_number_foreign?: string;
  account_number_usd?: string;
  request_date: string;
  note?: string;
  prepared_by_name: string;
  prepared_by_id?: string;
  approved_by_name?: string;
  approved_by_id?: string;
  invoice_attachment_id?: string;
  status?: string;
}

const E_SIGN_MAP: Record<string, string> = {
  'sylvia@gesit.co.id':        '/image/e-sign/sylvia.png',
  'rudi.siarudin@gesit.co.id': '/image/e-sign/siarudin.png',
  'desi@gesit.co.id':          '/image/e-sign/desi.png',
};

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(''); return; }
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = URL.createObjectURL(blob);
    });
  } catch { return null; }
};

/**
 * Resolves an e-sign image (returns a PNG data URL or null).
 * Accepts raw base64 data URL, remote URL, or local path.
 */
const resolveESignImage = async (eSignUrlOrPath?: string | null): Promise<string | null> => {
  if (!eSignUrlOrPath) return null;
  const trimmed = eSignUrlOrPath.trim();
  if (!trimmed) return null;

  // If already a base64 data URL, return directly
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Otherwise fetch and convert to base64
  return await fetchImageAsBase64(trimmed);
};

/**
 * Fetch all e-signatures for users from user_accounts table, matching by ID, full_name, and email.
 */
const prefetchESignMap = async (): Promise<Record<string, string | null>> => {
  const cache: Record<string, string | null> = {};
  try {
    const { data: users } = await supabase
      .from('user_accounts')
      .select('id, email, full_name, e_sign_url');

    if (users && Array.isArray(users)) {
      for (const u of users) {
        let sign = u.e_sign_url ? await resolveESignImage(u.e_sign_url) : null;
        if (!sign && u.email) {
          const fallback = E_SIGN_MAP[u.email.toLowerCase().trim()];
          if (fallback) sign = await fetchImageAsBase64(fallback);
        }

        if (sign) {
          if (u.id) cache[u.id.toLowerCase().trim()] = sign;
          if (u.email) cache[u.email.toLowerCase().trim()] = sign;
          if (u.full_name) cache[u.full_name.toLowerCase().trim()] = sign;
        }
      }
    }
  } catch (err) {
    console.error('Error prefetching e-signs:', err);
  }
  return cache;
};

const fmtAmt = (currency: string, amount: number) =>
  `${currency} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(amount)}`;

export const generateOffshoreInvoicePdf = async (dataList: OffshoreInvoiceData[]) => {
  // Pre-load ceklist image
  const ceklistBase64 = await fetchImageAsBase64('/image/ceklist.png');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Pre-fetch all e-signatures dynamically from user_accounts
  const eSignMap = await prefetchESignMap();

  const getSign = (userId?: string, userName?: string): string | null => {
    if (userId && eSignMap[userId.toLowerCase().trim()]) {
      return eSignMap[userId.toLowerCase().trim()];
    }
    if (userName && eSignMap[userName.toLowerCase().trim()]) {
      return eSignMap[userName.toLowerCase().trim()];
    }
    if (userName && E_SIGN_MAP[userName.toLowerCase().trim()]) {
      return eSignMap[userName.toLowerCase().trim()] || null;
    }
    return null;
  };

  const pageW = 210;
  const slotH = 148.5;
  const mL    = 10; // left margin
  const tR    = 200; // right edge

  // Table column x-positions
  const c1x = mL;
  const c1w = 33;
  const c2x = mL + c1w;  // 43
  const c2w = 120;
  const c3x = c2x + c2w; // 163
  const c3w = tR - c3x;  // 37

  dataList.forEach((data, index) => {
    if (index > 0 && index % 2 === 0) doc.addPage();

    const slot = index % 2;
    const oY   = slot * slotH;

    // Cut line
    if (slot === 0 && dataList.length > 1) {
      doc.setDrawColor(160, 160, 160);
      doc.setLineDashPattern([3, 3], 0);
      doc.setLineWidth(0.25);
      doc.line(0, slotH, pageW, slotH);
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(0);
    }

    let y = oY + 8;

    // ── ROW 1: TITLE ───────────────────────────────────────────────
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    const t1 = 'BUKTI PENGELUARAN';
    const t1w = doc.getTextWidth(t1);
    doc.text(t1, pageW / 2, y, { align: 'center' });
    // underline
    doc.setLineWidth(0.5);
    doc.line(pageW / 2 - t1w / 2, y + 1, pageW / 2 + t1w / 2, y + 1);

    // ── ROW 2: CASH VOUCHER ──────────────────────────────────────────
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('CASH VOUCHER', pageW / 2, y, { align: 'center' });

    // ── ROW 3: Left Dotted Line (Project) + K.K. No. ─────────────────
    y += 7;
    if (data.company) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text(data.company, mL, y - 1);
    }
    // left dotted line
    doc.setLineDashPattern([1, 1], 0); doc.setLineWidth(0.3);
    doc.line(mL, y, 75, y); 
    doc.setLineDashPattern([], 0);

    // K.K. No.
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('K.K. No.', 140, y);
    doc.text(':', 155, y);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(158, y, tR, y);
    doc.setLineDashPattern([], 0);

    // ── ROW 4: Tanggal ───────────────────────────────────────────────
    y += 4;
    const dateStr = data.request_date ? new Date(data.request_date).toLocaleDateString('id-ID') : '';
    doc.text('Tanggal', 140, y);
    doc.text(':', 155, y);
    if (dateStr) doc.text(dateStr, 158, y - 0.5);
    doc.setLineDashPattern([1, 1], 0); doc.setLineWidth(0.3);
    doc.line(158, y, tR, y);
    doc.setLineDashPattern([], 0);

    // ── ROW 5: DIBAYAR KEPADA ────────────────────────────────────────
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text('DIBAYAR KEPADA', mL, y);
    doc.text(':', mL + 33, y);
    if (data.paid_to) doc.text(data.paid_to, mL + 36, y - 0.5);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(mL + 36, y, 155, y);
    doc.setLineDashPattern([], 0);

    // ── DENGAN ───────────────────────────────────────────────────────────────
    y += 5;
    doc.text('DENGAN', mL, y);
    doc.text(':', mL + 33, y);

    const cbs = [
      { label: 'TUNAI',        key: 'TUNAI' },
      { label: 'GIRO',         key: 'GIRO' },
      { label: 'CEK TUNAI',    key: 'CEK_TUNAI' },
      { label: 'T.T/TRANSFER', key: 'TT_TRANSFER' },
    ];
    let cbx = mL + 36;
    cbs.forEach(cb => {
      const checked = data.payment_method === cb.key;
      doc.setLineWidth(0.3);
      doc.rect(cbx, y - 3.5, 4, 4);
      if (checked && ceklistBase64) {
        doc.addImage(ceklistBase64, 'PNG', cbx - 0.2, y - 4, 5, 5, `cbk_${cb.key}_${index}`, 'FAST');
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(cb.label, cbx + 5.5, y);
      cbx += doc.getTextWidth(cb.label) + 14;
    });

    // ── TABLE (fixed rows) ───────────────────────────────────────────────────
    y += 3;
    const tableTop = y;
    const rowH = 4.5;
    const hdrH = 5.5;

    // Prepare fixed 10 rows: each = { col1, col2, col3, bold3 }
    const bankCode = [
      data.bank_code  ? `Bank Code ${data.bank_code}` : '',
      data.swift_code ? `Swift Code ${data.swift_code}` : '',
    ].filter(Boolean).join('    ');
    const acNo = [
      data.account_number_foreign ? `A/C No. (${data.foreign_currency}) ${data.account_number_foreign}` : '',
      data.account_number_usd     ? `(USD) ${data.account_number_usd}` : '',
    ].filter(Boolean).join('  ');

    const rows: Array<{ c1: string; c2: string; c3: string; boldC3?: boolean }> = [
      { c1: '',                  c2: '',                        c3: '' },
      { c1: data.account_code || '', c2: data.payment_description, c3: '' },
      { c1: '',                  c2: data.payment_fee_note || '', c3: '' },
      { c1: '',                  c2: '',                         c3: '' },
      { c1: '',                  c2: '',                         c3: fmtAmt(data.foreign_currency, data.foreign_amount), boldC3: true },
      { c1: '',                  c2: `Bank: ${data.bank_name}`,  c3: '' },
      { c1: '',                  c2: `Account Name: ${data.account_name}`, c3: '' },
      { c1: '',                  c2: bankCode,                   c3: '' },
      { c1: '',                  c2: acNo,                       c3: '' },
      { c1: '',                  c2: '',                        c3: '' },
      { c1: '',                  c2: '',                        c3: '' },
    ];

    // Draw table header
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Kode/Nama A/C',    c1x + c1w / 2, y + 3.8, { align: 'center' });
    doc.text('Untuk Pembayaran', c2x + c2w / 2, y + 3.8, { align: 'center' });
    doc.text('Rupiah',           c3x + c3w / 2, y + 3.8, { align: 'center' });

    // Draw each row content
    rows.forEach((row, ri) => {
      const ry = tableTop + hdrH + ri * rowH;
      if (row.c1) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text(row.c1, c1x + 2, ry + 3.2);
      }
      if (row.c2) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        const lines = doc.splitTextToSize(row.c2, c2w - 3);
        doc.text(lines[0], c2x + 2, ry + 3.2);
      }
      if (row.c3) {
        if (row.boldC3) { doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); }
        else            { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); }
        doc.text(row.c3, tR - 2, ry + 3.2, { align: 'right' });
      }
    });
    doc.setFont('helvetica', 'normal');

    const jumlahTop = tableTop + hdrH + rows.length * rowH;

    // Draw JUMLAH row content
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Jumlah', c3x - 2, jumlahTop + 3.8, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(fmtAmt(data.foreign_currency, data.foreign_amount), tR - 2, jumlahTop + 3.8, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    const tableBot = jumlahTop + 5.5;

    // Draw all table borders
    doc.setLineWidth(0.4); doc.setDrawColor(0);
    doc.rect(mL, tableTop, tR - mL, tableBot - tableTop);  // outer
    doc.line(c2x, tableTop, c2x, tableBot);                // col1|col2 vertical
    doc.line(c3x, tableTop, c3x, tableBot);                // col2|col3 vertical
    // Header bottom
    doc.line(mL, tableTop + hdrH, tR, tableTop + hdrH);
    // Each row separator
    rows.forEach((_, ri) => {
      const lineY = tableTop + hdrH + (ri + 1) * rowH;
      doc.setLineWidth(0.2);
      doc.line(mL, lineY, tR, lineY);
    });
    // Jumlah separator (before jumlah row)
    doc.setLineWidth(0.4);
    doc.line(mL, jumlahTop, tR, jumlahTop);

    y = tableBot;

    // ── RUPIAH LINES ─────────────────────────────────────────────────────────
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Rupiah', 55, y);
    doc.text(':', 70, y);
    doc.setLineDashPattern([1, 1], 0); doc.setLineWidth(0.3);
    doc.line(73, y, tR, y);
    y += 4;
    doc.line(73, y, tR, y);
    doc.setLineDashPattern([], 0);

    // ── CEK/BG & BANK ────────────────────────────────────────────────────────
    y += 6;
    doc.setFontSize(8);
    doc.text('Cek/BG No.', mL, y);
    doc.text(':', mL + 20, y);
    doc.setLineDashPattern([1, 1], 0); doc.setLineWidth(0.3);
    doc.line(mL + 23, y, mL + 75, y);
    y += 4;
    doc.text('Bank', mL, y);
    doc.text(':', mL + 20, y);
    doc.line(mL + 23, y, mL + 75, y);
    doc.setLineDashPattern([], 0);

    // ── SIGNATURE BOXES ───────────────────────────────────────────────────────
    y += 5;
    const sigLabels = ['Disetujui', 'Finance', 'Pembukuan', 'Diminta'];
    const sigW = 29; const sigH = 18; const sigGap = 1;
    const prepSign = getSign(data.prepared_by_id, data.prepared_by_name);
    const apprSign = (data.status === 'APPROVED' || data.status === 'PAID')
      ? getSign(data.approved_by_id, data.approved_by_name)
      : (data.approved_by_name ? getSign(data.approved_by_id, data.approved_by_name) : null);

    sigLabels.forEach((label, i) => {
      const bx = mL + i * (sigW + sigGap);
      doc.setLineWidth(0.3);
      doc.rect(bx, y, sigW, sigH);
      doc.line(bx, y + 6, bx + sigW, y + 6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.text(label, bx + sigW / 2, y + 4, { align: 'center' });

      const sih = 8; const siw = Math.min(sigW - 4, 14);
      if (label === 'Disetujui' && apprSign) {
        doc.addImage(apprSign, 'PNG', bx + (sigW - siw) / 2, y + 6.5, siw, sih, `appr${index}`, 'FAST');
      }
      if (label === 'Diminta' && prepSign) {
        doc.addImage(prepSign, 'PNG', bx + (sigW - siw) / 2, y + 6.5, siw, sih, `prep${index}`, 'FAST');
      }
      doc.setFont('helvetica', 'italic'); doc.setFontSize(6); doc.setTextColor(100, 100, 100);
      if (label === 'Disetujui') doc.text(data.approved_by_name || '', bx + sigW / 2, y + sigH - 1.5, { align: 'center' });
      if (label === 'Diminta')   doc.text(data.prepared_by_name || '', bx + sigW / 2, y + sigH - 1.5, { align: 'center' });
      doc.setTextColor(0);
    });

    // Diterima oleh
    const dtx = mL + 4 * (sigW + sigGap) + 12;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Diterima oleh :', dtx, y + 4);
    doc.setLineWidth(0.3);
    doc.line(dtx, y + sigH, tR, y + sigH);
  });

  // Page numbers
  const pc = doc.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
    doc.text(`Page ${i} / ${pc}`, 105, 294, { align: 'center' });
    doc.setTextColor(0);
  }

  const fn = dataList.length === 1
    ? `${dataList[0].invoice_number}_CashVoucher.pdf`
    : `Batch_${dataList.length}_CashVoucher.pdf`;
  doc.save(fn);
};
