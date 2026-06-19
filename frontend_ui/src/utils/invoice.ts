import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

export interface InvoiceData {
  loanId: bigint;
  lenderName: string;
  borrowerName: string;
  lenderAddress: string;
  borrowerAddress: string;
  principalAmount: bigint;
  interest: bigint;
  duration: bigint; // seconds
  penalty: bigint;
  platformFee: bigint;
  tokenName: string;
  transactionHash: string;
  timestamp: string; // ISO string
  status: string;
}

/**
 * Generates a PDF invoice and triggers a download.
 * Uses pdf-lib to build a simple, clean invoice layout.
 */
export async function generateInvoice(data: InvoiceData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 12;
  const lineHeight = 20;
  let y = height - 60;

  const drawLine = (label: string, value: string, isBold = false) => {
    page.drawText(`${label}: ${value}`, {
      x: 50,
      y,
      size: fontSize,
      font: isBold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  };

  // Header
  page.drawText('Blockchain Transaction Invoice', {
    x: 50,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.7),
  });
  y -= lineHeight * 2;

  drawLine('Loan ID', data.loanId.toString(), true);
  drawLine('Lender Name', data.lenderName);
  drawLine('Borrower Name', data.borrowerName);
  drawLine('Lender Address', data.lenderAddress);
  drawLine('Borrower Address', data.borrowerAddress);
  drawLine('Principal Amount', `${data.principalAmount.toString()} ${data.tokenName}`);
  drawLine('Interest', `${data.interest.toString()} ${data.tokenName}`);
  drawLine('Duration (seconds)', data.duration.toString());
  drawLine('Penalty', `${data.penalty.toString()} ${data.tokenName}`);
  drawLine('Platform Fee', `${data.platformFee.toString()} ${data.tokenName}`);
  drawLine('Transaction Hash', data.transactionHash);
  drawLine('Timestamp', data.timestamp);
  drawLine('Status', data.status, true);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const fileName = `invoice_loan_${data.loanId.toString()}.pdf`;
  saveAs(blob, fileName);
}
