import jsPDF from 'jspdf';
import { Proposal, ProposalItem } from '@/domain/entities/Proposal';
import { Tenant } from '@/domain/entities/Tenant';

export interface ProposalPdfOptions {
  fontSize?: number;
  margin?: number;
}

// Colors
const BRAND_PRIMARY = [37, 99, 235] as const; // Blue-600
const BRAND_DARK = [30, 64, 175] as const; // Blue-800
const TEXT_PRIMARY = [17, 24, 39] as const; // Gray-900
const TEXT_SECONDARY = [107, 114, 128] as const; // Gray-500
const BORDER_COLOR = [229, 231, 235] as const; // Gray-200
const BG_LIGHT = [249, 250, 251] as const; // Gray-50
const BG_HEADER = [37, 99, 235] as const; // Blue-600
const WHITE = [255, 255, 255] as const;

// Font family used throughout the PDF (helvetica supports Turkish chars in jsPDF 2.5+)
const FONT_FAMILY = 'helvetica';

export class ProposalPdfService {
  private static readonly PAGE_WIDTH = 210;
  private static readonly PAGE_HEIGHT = 297;
  private static readonly MARGIN = 20;
  private static readonly CONTENT_WIDTH = 210 - 2 * 20; // 170mm

  static generateProposalPdf(
    proposal: Proposal,
    tenant: Tenant,
    options: ProposalPdfOptions = {}
  ): Buffer {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'A4',
    });

    pdf.setFont(FONT_FAMILY, 'normal');

    const margin = this.MARGIN;
    let y = margin;

    // === HEADER: Company info + Proposal meta ===
    y = this.drawHeader(pdf, tenant, proposal, margin, y);

    // === CUSTOMER INFO ===
    y = this.drawCustomerSection(pdf, proposal, margin, y);

    // === ITEMS TABLE ===
    y = this.drawItemsTable(pdf, proposal.items, margin, y);

    // === TOTALS ===
    y = this.drawTotals(pdf, proposal, margin, y);

    // === TERMS & CONDITIONS ===
    y = this.drawTerms(pdf, proposal, margin, y);

    // === FOOTER on all pages ===
    this.drawFooter(pdf, tenant, margin);

    return Buffer.from(pdf.output('arraybuffer'));
  }

  // ──────────────────────────────────────────────
  //  HEADER
  // ──────────────────────────────────────────────
  private static drawHeader(
    pdf: jsPDF,
    tenant: Tenant,
    proposal: Proposal,
    margin: number,
    y: number
  ): number {
    // Blue header bar
    pdf.setFillColor(...BRAND_PRIMARY);
    pdf.rect(0, 0, this.PAGE_WIDTH, 40, 'F');

    // Company name (white, bold)
    pdf.setTextColor(...WHITE);
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.setFontSize(22);
    pdf.text(tenant.name, margin, 18);

    // Company details under name
    pdf.setFont(FONT_FAMILY, 'normal');
    pdf.setFontSize(9);
    const details: string[] = [];
    if (tenant.email) details.push(tenant.email);
    if (tenant.phone) details.push(tenant.phone);
    if (tenant.taxNumber) details.push(`VN: ${tenant.taxNumber}`);
    if (details.length > 0) {
      pdf.text(details.join('  |  '), margin, 26);
    }
    if (tenant.address) {
      pdf.text(tenant.address, margin, 32);
    }

    // "TEKLİF" label on the right side
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.setFontSize(16);
    pdf.text('TEKLİF', this.PAGE_WIDTH - margin, 18, { align: 'right' });

    // Reset text color
    pdf.setTextColor(...TEXT_PRIMARY);

    y = 50;

    // Proposal info row
    const infoBoxY = y;
    pdf.setFillColor(...BG_LIGHT);
    pdf.roundedRect(margin, infoBoxY, this.CONTENT_WIDTH, 22, 2, 2, 'F');

    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_SECONDARY);
    pdf.setFont(FONT_FAMILY, 'normal');

    const col1 = margin + 5;
    const col2 = margin + 45;
    const col3 = margin + 95;
    const col4 = margin + 140;

    // Row 1 labels
    pdf.text('Teklif No', col1, infoBoxY + 6);
    pdf.text('Tarih', col2, infoBoxY + 6);
    pdf.text('Geçerlilik', col3, infoBoxY + 6);
    pdf.text('Durum', col4, infoBoxY + 6);

    // Row 1 values
    pdf.setTextColor(...TEXT_PRIMARY);
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.setFontSize(10);
    pdf.text(proposal.number, col1, infoBoxY + 13);
    pdf.text(this.formatDate(proposal.date), col2, infoBoxY + 13);
    pdf.text(this.formatDate(proposal.validUntil), col3, infoBoxY + 13);

    // Status badge
    const statusText = this.getStatusText(proposal.status);
    const statusColor = this.getStatusColor(proposal.status);
    pdf.setFillColor(...statusColor);
    pdf.setTextColor(...WHITE);
    pdf.setFontSize(8);
    const statusWidth = pdf.getTextWidth(statusText) + 6;
    pdf.roundedRect(col4, infoBoxY + 8, statusWidth, 6, 1.5, 1.5, 'F');
    pdf.text(statusText, col4 + 3, infoBoxY + 12.5);

    pdf.setTextColor(...TEXT_PRIMARY);
    return infoBoxY + 30;
  }

  // ──────────────────────────────────────────────
  //  CUSTOMER
  // ──────────────────────────────────────────────
  private static drawCustomerSection(
    pdf: jsPDF,
    proposal: Proposal,
    margin: number,
    y: number
  ): number {
    // Section title
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...BRAND_DARK);
    pdf.text('Müşteri Bilgileri', margin, y);
    y += 2;

    // Blue underline
    pdf.setDrawColor(...BRAND_PRIMARY);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + 40, y);
    y += 5;

    pdf.setTextColor(...TEXT_PRIMARY);
    pdf.setFontSize(9);

    const leftCol = margin;
    const rightCol = margin + this.CONTENT_WIDTH / 2;
    const labelWidth = 22;

    // Row 1: Company name + Tax number
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.text('Firma:', leftCol, y);
    pdf.setFont(FONT_FAMILY, 'normal');
    pdf.text(proposal.customer.companyName || proposal.customer.name, leftCol + labelWidth, y);

    if (proposal.customer.taxNumber) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('Vergi No:', rightCol, y);
      pdf.setFont(FONT_FAMILY, 'normal');
      pdf.text(proposal.customer.taxNumber, rightCol + labelWidth, y);
    }
    y += 5;

    // Row 2: Contact + Title
    if (proposal.customer.name && proposal.customer.name !== proposal.customer.companyName) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('İlgili:', leftCol, y);
      pdf.setFont(FONT_FAMILY, 'normal');
      pdf.text(proposal.customer.name, leftCol + labelWidth, y);
    }
    if (proposal.customer.title) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('Ünvan:', rightCol, y);
      pdf.setFont(FONT_FAMILY, 'normal');
      pdf.text(proposal.customer.title, rightCol + labelWidth, y);
    }
    y += 5;

    // Row 3: Phone + Email
    if (proposal.customer.phone) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('Telefon:', leftCol, y);
      pdf.setFont(FONT_FAMILY, 'normal');
      pdf.text(proposal.customer.phone, leftCol + labelWidth, y);
    }
    if (proposal.customer.email) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('E-posta:', rightCol, y);
      pdf.setFont(FONT_FAMILY, 'normal');
      pdf.text(proposal.customer.email, rightCol + labelWidth, y);
    }
    y += 5;

    // Row 4: Address
    if (proposal.customer.address) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('Adres:', leftCol, y);
      pdf.setFont(FONT_FAMILY, 'normal');
      const addressLines = pdf.splitTextToSize(proposal.customer.address, this.CONTENT_WIDTH - labelWidth);
      pdf.text(addressLines, leftCol + labelWidth, y);
      y += addressLines.length * 4;
    }

    return y + 8;
  }

  // ──────────────────────────────────────────────
  //  ITEMS TABLE
  // ──────────────────────────────────────────────
  private static drawItemsTable(
    pdf: jsPDF,
    items: ProposalItem[],
    margin: number,
    y: number
  ): number {
    // Section title
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...BRAND_DARK);
    pdf.text('Teklif Kalemleri', margin, y);
    y += 2;
    pdf.setDrawColor(...BRAND_PRIMARY);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + 40, y);
    y += 5;

    // Table column definitions
    // #(8) | Ürün(50) | Miktar(18) | Birim(15) | B.Fiyat(25) | İsk%(15) | KDV%(12) | Toplam(27)
    const cols = [
      { header: '#', width: 8, align: 'center' as const },
      { header: 'Ürün / Hizmet', width: 50, align: 'left' as const },
      { header: 'Miktar', width: 18, align: 'right' as const },
      { header: 'Birim', width: 15, align: 'left' as const },
      { header: 'Birim Fiyat', width: 25, align: 'right' as const },
      { header: 'İskonto', width: 15, align: 'right' as const },
      { header: 'KDV', width: 12, align: 'right' as const },
      { header: 'Toplam', width: 27, align: 'right' as const },
    ];

    const tableWidth = cols.reduce((s, c) => s + c.width, 0);
    const rowHeight = 7;

    // Draw header row
    pdf.setFillColor(...BG_HEADER);
    pdf.setTextColor(...WHITE);
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.setFontSize(8);

    let x = margin;
    pdf.roundedRect(margin, y, tableWidth, rowHeight, 1, 1, 'F');
    cols.forEach((col) => {
      const textX = col.align === 'right' ? x + col.width - 2
        : col.align === 'center' ? x + col.width / 2
        : x + 2;
      const alignOpt = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
      pdf.text(col.header, textX, y + 5, { align: alignOpt as any });
      x += col.width;
    });
    y += rowHeight;

    // Draw rows
    pdf.setTextColor(...TEXT_PRIMARY);
    pdf.setFont(FONT_FAMILY, 'normal');
    pdf.setFontSize(8);

    items.forEach((item, idx) => {
      // Page break check
      if (y > this.PAGE_HEIGHT - 40) {
        pdf.addPage();
        y = this.MARGIN;
      }

      // Alternate row background
      if (idx % 2 === 0) {
        pdf.setFillColor(...BG_LIGHT);
        pdf.rect(margin, y, tableWidth, rowHeight, 'F');
      }

      // Bottom border
      pdf.setDrawColor(...BORDER_COLOR);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y + rowHeight, margin + tableWidth, y + rowHeight);

      x = margin;
      const rowData = [
        (idx + 1).toString(),
        item.name,
        this.formatNumber(item.quantity),
        item.unit,
        this.formatCurrency(item.unitPrice),
        item.discount ? `%${this.formatNumber(item.discount)}` : '-',
        item.tax ? `%${this.formatNumber(item.tax)}` : '-',
        this.formatCurrency(item.total),
      ];

      cols.forEach((col, colIdx) => {
        let cellText = rowData[colIdx];

        // Truncate long product names
        if (colIdx === 1) {
          const maxWidth = col.width - 4;
          while (pdf.getTextWidth(cellText) > maxWidth && cellText.length > 3) {
            cellText = cellText.slice(0, -4) + '...';
          }
        }

        const textX = col.align === 'right' ? x + col.width - 2
          : col.align === 'center' ? x + col.width / 2
          : x + 2;
        const alignOpt = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
        pdf.text(cellText, textX, y + 5, { align: alignOpt as any });
        x += col.width;
      });

      y += rowHeight;
    });

    return y + 5;
  }

  // ──────────────────────────────────────────────
  //  TOTALS
  // ──────────────────────────────────────────────
  private static drawTotals(
    pdf: jsPDF,
    proposal: Proposal,
    margin: number,
    y: number
  ): number {
    const boxWidth = 80;
    const boxX = margin + this.CONTENT_WIDTH - boxWidth;
    const labelX = boxX + 5;
    const valueX = boxX + boxWidth - 5;

    pdf.setFontSize(9);

    // Subtotal
    pdf.setFont(FONT_FAMILY, 'normal');
    pdf.setTextColor(...TEXT_SECONDARY);
    pdf.text('Ara Toplam:', labelX, y);
    pdf.setTextColor(...TEXT_PRIMARY);
    pdf.text(this.formatCurrency(proposal.subtotal), valueX, y, { align: 'right' });
    y += 6;

    // Discount
    if (proposal.discountAmount && proposal.discountAmount > 0) {
      pdf.setTextColor(...TEXT_SECONDARY);
      pdf.text('İskonto:', labelX, y);
      pdf.setTextColor(220, 38, 38); // red-600
      pdf.text(`-${this.formatCurrency(proposal.discountAmount)}`, valueX, y, { align: 'right' });
      y += 6;
    }

    // Tax
    if (proposal.taxAmount && proposal.taxAmount > 0) {
      pdf.setTextColor(...TEXT_SECONDARY);
      pdf.text('KDV:', labelX, y);
      pdf.setTextColor(...TEXT_PRIMARY);
      pdf.text(this.formatCurrency(proposal.taxAmount), valueX, y, { align: 'right' });
      y += 6;
    }

    // Divider
    pdf.setDrawColor(...BRAND_PRIMARY);
    pdf.setLineWidth(0.5);
    pdf.line(boxX, y, boxX + boxWidth, y);
    y += 5;

    // Grand Total
    pdf.setFillColor(...BRAND_PRIMARY);
    pdf.roundedRect(boxX, y - 3, boxWidth, 10, 2, 2, 'F');
    pdf.setTextColor(...WHITE);
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.setFontSize(11);
    pdf.text('GENEL TOPLAM', labelX, y + 4);
    pdf.text(this.formatCurrency(proposal.total), valueX, y + 4, { align: 'right' });

    pdf.setTextColor(...TEXT_PRIMARY);
    return y + 18;
  }

  // ──────────────────────────────────────────────
  //  TERMS & CONDITIONS
  // ──────────────────────────────────────────────
  private static drawTerms(
    pdf: jsPDF,
    proposal: Proposal,
    margin: number,
    y: number
  ): number {
    const hasTerms = proposal.paymentTerms || proposal.deliveryTerms || proposal.notes;
    if (!hasTerms) return y;

    if (y > this.PAGE_HEIGHT - 60) {
      pdf.addPage();
      y = this.MARGIN;
    }

    // Section title
    pdf.setFont(FONT_FAMILY, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...BRAND_DARK);
    pdf.text('Şartlar ve Koşullar', margin, y);
    y += 2;
    pdf.setDrawColor(...BRAND_PRIMARY);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + 40, y);
    y += 6;

    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_PRIMARY);

    if (proposal.paymentTerms) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('Ödeme Koşulları', margin, y);
      y += 4;
      pdf.setFont(FONT_FAMILY, 'normal');
      const lines = pdf.splitTextToSize(proposal.paymentTerms, this.CONTENT_WIDTH - 5);
      pdf.text(lines, margin + 3, y);
      y += lines.length * 4 + 4;
    }

    if (proposal.deliveryTerms) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('Teslimat Koşulları', margin, y);
      y += 4;
      pdf.setFont(FONT_FAMILY, 'normal');
      const lines = pdf.splitTextToSize(proposal.deliveryTerms, this.CONTENT_WIDTH - 5);
      pdf.text(lines, margin + 3, y);
      y += lines.length * 4 + 4;
    }

    if (proposal.notes) {
      pdf.setFont(FONT_FAMILY, 'bold');
      pdf.text('Notlar', margin, y);
      y += 4;
      pdf.setFont(FONT_FAMILY, 'normal');
      const lines = pdf.splitTextToSize(proposal.notes, this.CONTENT_WIDTH - 5);
      pdf.text(lines, margin + 3, y);
      y += lines.length * 4;
    }

    return y + 5;
  }

  // ──────────────────────────────────────────────
  //  FOOTER
  // ──────────────────────────────────────────────
  private static drawFooter(pdf: jsPDF, tenant: Tenant, margin: number): void {
    const totalPages = pdf.getNumberOfPages();
    const footerY = this.PAGE_HEIGHT - 10;

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      // Separator line
      pdf.setDrawColor(...BORDER_COLOR);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY - 3, this.PAGE_WIDTH - margin, footerY - 3);

      pdf.setFontSize(7);
      pdf.setFont(FONT_FAMILY, 'normal');
      pdf.setTextColor(...TEXT_SECONDARY);

      // Left: company info
      pdf.text(`${tenant.name} | TeklifPro ile oluşturuldu`, margin, footerY);

      // Right: page number
      pdf.text(
        `Sayfa ${i} / ${totalPages}`,
        this.PAGE_WIDTH - margin,
        footerY,
        { align: 'right' }
      );
    }

    // Reset
    pdf.setTextColor(...TEXT_PRIMARY);
  }

  // ──────────────────────────────────────────────
  //  HELPERS
  // ──────────────────────────────────────────────
  private static formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private static formatNumber(num: number): string {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }

  private static getStatusText(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Taslak',
      SENT: 'Gönderildi',
      VIEWED: 'Görüntülendi',
      ACCEPTED: 'Kabul Edildi',
      REJECTED: 'Reddedildi',
      REVISION_REQUESTED: 'Revizyon İstendi',
      REVISED: 'Revize Edildi',
      EXPIRED: 'Süresi Doldu',
      CANCELLED: 'İptal Edildi',
    };
    return map[status] || map[status?.toUpperCase()] || status;
  }

  private static getStatusColor(status: string): readonly [number, number, number] {
    const colors: Record<string, readonly [number, number, number]> = {
      DRAFT: [107, 114, 128],       // gray
      SENT: [37, 99, 235],          // blue
      VIEWED: [234, 179, 8],        // yellow
      ACCEPTED: [22, 163, 74],      // green
      REJECTED: [220, 38, 38],      // red
      REVISION_REQUESTED: [234, 88, 12], // orange
      REVISED: [147, 51, 234],      // purple
      EXPIRED: [71, 85, 105],       // slate
      CANCELLED: [107, 114, 128],   // gray
    };
    return colors[status] || colors[status?.toUpperCase()] || [107, 114, 128];
  }
}
