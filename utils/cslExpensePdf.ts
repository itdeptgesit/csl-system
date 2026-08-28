import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabaseClient';

export interface ExpenseApprovalData {
  expense_number: string;
  company: string;
  department: string;
  project_name: string;
  request_date: string;
  paid_to: string;
  note: string;
  total_amount: number;
  invoice_number: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  prepared_by_name: string;
  approved_by_name?: string;
  status?: string;
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

const fetchLogoAsBase64 = async (url: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Grayscale conversion
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // Luma formula for better grayscale representation
          const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = luma;
          data[i + 1] = luma;
          data[i + 2] = luma;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = URL.createObjectURL(blob);
    });
  } catch (e) {
    return null;
  }
};

export const generateExpenseApprovalPdf = async (dataList: ExpenseApprovalData[]) => {
  // A4 size is 210 x 297 mm. A4 divided by 6 (2 cols x 3 rows) is 105 x 99 mm per cell.
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoBase64 = await fetchLogoAsBase64('/image/logo.png');

  const cellW = 105;
  const cellH = 99;

  dataList.forEach((data, index) => {
    // Add new page every 6 items
    if (index > 0 && index % 6 === 0) {
      doc.addPage();
    }

    const pageIndex = index % 6;
    const col = pageIndex % 2;
    const row = Math.floor(pageIndex / 2);

    const offsetX = col * cellW;
    const offsetY = row * cellH;

    // --- Draw Cutting Lines ---
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.2);
    // Draw borders (except outer page edges to avoid margins, but for simplicity draw all cell borders)
    doc.rect(offsetX, offsetY, cellW, cellH);
    doc.setDrawColor(0, 0, 0); // Reset color
    doc.setLineDashPattern([], 0); // Reset dash

    // Fonts & styles
    doc.setFont('helvetica');

    // Draw Logo & text
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', offsetX + 5, offsetY + 5, 8, 8, 'gesitLogo', 'FAST');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('THE GESIT COMPANIES', offsetX + 15, offsetY + 10.5);
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('THE GESIT COMPANIES', offsetX + 5, offsetY + 10.5);
    }
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const title = 'Expenses Approval';
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, offsetX + (cellW - titleWidth) / 2, offsetY + 18);
    doc.setLineWidth(0.5);
    doc.line(offsetX + (cellW - titleWidth) / 2, offsetY + 19, offsetX + (cellW + titleWidth) / 2, offsetY + 19);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Grid coordinates
    // Total width is 105. Use 4 to 101.
    const col1X = offsetX + 4;
    const col1ColonX = offsetX + 20;
    const col1ValX = offsetX + 22;
    const col1EndX = offsetX + 50;
    
    const col2X = offsetX + 53;
    const col2ColonX = offsetX + 64;
    const col2ValX = offsetX + 66;
    const col2EndX = offsetX + 101;

    doc.setLineWidth(0.2);
    // Set a consistent line height for text wrapping
    doc.setLineHeightFactor(1.3);
    const lineHeightMm = 3.66; // 8pt * 1.3 = 10.4pt = ~3.66mm

    const drawField = (label: string, value: string, x: number, colonX: number, valX: number, endX: number, y: number) => {
      doc.text(label, x, y);
      doc.text(':', colonX, y);
      const splitVal = doc.splitTextToSize(value, endX - valX);
      doc.text(splitVal, valX, y);
      
      const lines = Math.max(1, splitVal.length);
      for (let i = 0; i < lines; i++) {
        // Draw line slightly below the text baseline
        const lineY = y + (i * lineHeightMm) + 1.2;
        doc.line(valX, lineY, endX, lineY);
      }
      return lines;
    };

    let y = offsetY + 28;
    
    // Row 1
    const linesR1C1 = drawField('Company', data.company, col1X, col1ColonX, col1ValX, col1EndX, y);
    const linesR1C2 = drawField('Dept.', data.department, col2X, col2ColonX, col2ValX, col2EndX, y);
    y += Math.max(linesR1C1, linesR1C2) * lineHeightMm + 3.5;

    // Row 2
    const linesR2C1 = drawField('Project Name', data.project_name, col1X, col1ColonX, col1ValX, col1EndX, y);
    const linesR2C2 = drawField('Paid to', data.paid_to, col2X, col2ColonX, col2ValX, col2EndX, y);
    y += Math.max(linesR2C1, linesR2C2) * lineHeightMm + 3.5;

    // Row 3
    const dateStr = data.request_date ? new Date(data.request_date).toLocaleDateString('id-ID') : '';
    const linesR3C1 = drawField('Request Date', dateStr, col1X, col1ColonX, col1ValX, col1EndX, y);
    const linesR3C2 = drawField('Note', data.note || '', col2X, col2ColonX, col2ValX, col2EndX, y);
    
    y += Math.max(linesR3C1, linesR3C2) * lineHeightMm + 3.5;
    
    // --- Left Side: Signature Box ---
    const boxX = offsetX + 5;
    const boxY = y;
    const boxW = 45;
    const boxH = 26; // slightly shorter to fit better
    
    doc.rect(boxX, boxY, boxW, boxH);
    doc.line(boxX + boxW/2, boxY, boxX + boxW/2, boxY + boxH); // Vertical split
    doc.line(boxX, boxY + 5, boxX + boxW, boxY + 5); // Header line
    doc.line(boxX, boxY + boxH - 5, boxX + boxW, boxY + boxH - 5); // Footer line

    // Signature Headers
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Prepared by', boxX + (boxW/4) - (doc.getTextWidth('Prepared by')/2), boxY + 3.5);
    doc.text('Approved by', boxX + (boxW*0.75) - (doc.getTextWidth('Approved by')/2), boxY + 3.5);

    // Signature Footers (Names)
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const footerPrep = data.prepared_by_name || '(Name)';
    doc.text(footerPrep, boxX + (boxW/4) - (doc.getTextWidth(footerPrep)/2), boxY + boxH - 1.5);
    const footerApp = data.approved_by_name || '(Name)';
    doc.text(footerApp, boxX + (boxW*0.75) - (doc.getTextWidth(footerApp)/2), boxY + boxH - 1.5);
    doc.setTextColor(0, 0, 0);

    // --- Right Side: Payment Details ---
    let rightY = y;
    const rightSideX = offsetX + 53;
    const rightSideEndX = offsetX + 100;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const amountText = `Total Tagihan Rp ${new Intl.NumberFormat('id-ID').format(data.total_amount)},-`;
    doc.text(amountText, rightSideX, rightY + 3);
    doc.line(rightSideX, rightY + 4, rightSideEndX, rightY + 4); // underline

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    const drawRightField = (label: string, rY: number) => {
      const split = doc.splitTextToSize(label, rightSideEndX - rightSideX);
      doc.text(split, rightSideX, rY);
      const lines = Math.max(1, split.length);
      for (let i = 0; i < lines; i++) {
        const lineY = rY + (i * lineHeightMm) + 1.2;
        doc.line(rightSideX, lineY, rightSideEndX, lineY);
      }
      return lines;
    };

    rightY += 8;
    const l1 = drawRightField(`No Inv: ${data.invoice_number}`, rightY);
    
    rightY += l1 * lineHeightMm + 3.5;
    const l2 = drawRightField(`Bank: ${data.bank_name}`, rightY);

    rightY += l2 * lineHeightMm + 3.5;
    drawRightField(`No Rek: ${data.account_number} an. ${data.account_name}`, rightY);
  });

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  // Output PDF - using the first voucher's ID or generic name
  const fileName = dataList.length === 1 
    ? `${dataList[0].expense_number}_Expenses_Approval.pdf`
    : `Batch_${dataList.length}_Expenses_Approval.pdf`;
  doc.save(fileName);
};
