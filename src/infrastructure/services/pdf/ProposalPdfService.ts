import jsPDF from 'jspdf';
import { Proposal, ProposalItem } from '@/domain/entities/Proposal';
import { Tenant } from '@/domain/entities/Tenant';

export interface ProposalPdfOptions {
  fontSize?: number;
  margin?: number;
}

export class ProposalPdfService {
  private static readonly PAGE_WIDTH = 210; // A4 in mm
  private static readonly PAGE_HEIGHT = 297; // A4 in mm
  private static readonly MARGIN = 15; // mm
  private static readonly CONTENT_WIDTH = this.PAGE_WIDTH - 2 * this.MARGIN;

  /**
   * Generate a beautiful PDF for a proposal with full Turkish character support
   */
  static generateProposalPdf(
    proposal: Proposal,
    tenant: Tenant,
    options: ProposalPdfOptions = {}
  ): Buffer {
    const { fontSize = 10, margin = this.MARGIN } = options;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'A4',
    });

    // Set default font with Turkish support
    pdf.setFont('helvetica');

    let yPosition = margin;

    // Header Section
    yPosition = this.addHeader(pdf, tenant, margin, yPosition);

    // Proposal Info Section
    yPosition = this.addProposalInfo(pdf, proposal, margin, yPosition);

    // Customer Info Section
    yPosition = this.addCustomerInfo(pdf, proposal, margin, yPosition);

    // Items Table
    yPosition = this.addItemsTable(pdf, proposal.items, margin, yPosition);

    // Totals Section
    yPosition = this.addTotalsSection(pdf, proposal, margin, yPosition);

    // Terms Section
    yPosition = this.addTermsSection(pdf, proposal, margin, yPosition);

    // Footer
    this.addFooter(pdf, margin);

    return Buffer.from(pdf.output('arraybuffer'));
  }

  private static addHeader(
    pdf: jsPDF,
    tenant: Tenant,
    margin: number,
    yPosition: number
  ): number {
    const lineHeight = 5;

    // Company Name (Bold, Larger)
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tenant.name, margin, yPosition);
    yPosition += 10;

    // Company Details
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    if (tenant.address) {
      pdf.text(tenant.address, margin, yPosition);
      yPosition += lineHeight;
    }

    if (tenant.city && tenant.postalCode) {
      pdf.text(`${tenant.postalCode} ${tenant.city}`, margin, yPosition);
      yPosition += lineHeight;
    }

    if (tenant.phone) {
      pdf.text(`Tel: ${tenant.phone}`, margin, yPosition);
      yPosition += lineHeight;
    }

    if (tenant.email) {
      pdf.text(`Email: ${tenant.email}`, margin, yPosition);
      yPosition += lineHeight;
    }

    if (tenant.taxNumber) {
      pdf.text(`Vergi No: ${tenant.taxNumber}`, margin, yPosition);
      yPosition += lineHeight;
    }

    yPosition += 5;

    // Divider Line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, this.PAGE_WIDTH - margin, yPosition);

    return yPosition + 8;
  }

  private static addProposalInfo(
    pdf: jsPDF,
    proposal: Proposal,
    margin: number,
    yPosition: number
  ): number {
    const contentWidth = this.CONTENT_WIDTH;
    const halfWidth = contentWidth / 2;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');

    // Left Column
    pdf.text('TKL No:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(proposal.number, margin + 25, yPosition);

    // Right Column
    pdf.setFont('helvetica', 'bold');
    pdf.text('Tarih:', margin + halfWidth, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(this.formatDate(proposal.date), margin + halfWidth + 20, yPosition);

    yPosition += 6;

    // Validity Period
    pdf.setFont('helvetica', 'bold');
    pdf.text('Geçerlilik:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      this.formatDate(proposal.validUntil),
      margin + 25,
      yPosition
    );

    // Status
    pdf.setFont('helvetica', 'bold');
    pdf.text('Durum:', margin + halfWidth, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(this.getStatusText(proposal.status), margin + halfWidth + 20, yPosition);

    return yPosition + 12;
  }

  private static addCustomerInfo(
    pdf: jsPDF,
    proposal: Proposal,
    margin: number,
    yPosition: number
  ): number {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Müşteri Bilgileri', margin, yPosition);

    yPosition += 7;

    const contentWidth = this.CONTENT_WIDTH;
    const halfWidth = contentWidth / 2;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');

    // Left Column
    pdf.text('Şirket:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(proposal.customer.companyName, margin + 25, yPosition);

    // Right Column
    pdf.setFont('helvetica', 'bold');
    pdf.text('Vergi No:', margin + halfWidth, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(proposal.customer.taxNumber || '', margin + halfWidth + 20, yPosition);

    yPosition += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.text('İsim:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(proposal.customer.name, margin + 25, yPosition);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Unvan:', margin + halfWidth, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(proposal.customer.title || '', margin + halfWidth + 20, yPosition);

    yPosition += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.text('Adres:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    const addressLines = pdf.splitTextToSize(proposal.customer.address || '', 70);
    pdf.text(addressLines, margin + 25, yPosition);

    yPosition += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.text('Telefon:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(proposal.customer.phone || '', margin + 25, yPosition);

    pdf.setFont('helvetica', 'bold');
    pdf.text('E-posta:', margin + halfWidth, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(proposal.customer.email || '', margin + halfWidth + 20, yPosition);

    return yPosition + 10;
  }

  private static addItemsTable(
    pdf: jsPDF,
    items: ProposalItem[],
    margin: number,
    yPosition: number
  ): number {
    const tableMargin = margin;
    const contentWidth = this.CONTENT_WIDTH;

    // Table Headers
    const headers = ['#', 'Ürün Adı', 'Açıklama', 'Miktar', 'Birim', 'Birim Fiyat', 'İskonto', 'KDV', 'Toplam'];

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.setDrawColor(180, 180, 180);

    // Column widths
    const colWidths = [8, 25, 25, 12, 10, 18, 15, 12, 20];
    let xPosition = tableMargin;

    // Draw header row
    let headerYPosition = yPosition;
    headers.forEach((header, idx) => {
      pdf.rect(xPosition, headerYPosition, colWidths[idx], 7, 'FD');
      pdf.text(header, xPosition + 1, headerYPosition + 4.5);
      xPosition += colWidths[idx];
    });

    yPosition += 7;

    // Table Rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFillColor(255, 255, 255);

    items.forEach((item, idx) => {
      if (yPosition > this.PAGE_HEIGHT - 30) {
        pdf.addPage();
        yPosition = margin;
      }

      xPosition = tableMargin;
      const rowHeight = 6;

      // Row data
      const rowData = [
        (idx + 1).toString(),
        item.name,
        item.description || '',
        this.formatNumber(item.quantity),
        item.unit,
        this.formatCurrency(item.unitPrice),
        item.discount ? this.formatCurrency(item.discount) : '-',
        item.tax ? `${item.tax}%` : '-',
        this.formatCurrency(item.total),
      ];

      rowData.forEach((data, idx) => {
        pdf.rect(xPosition, yPosition, colWidths[idx], rowHeight, 'S');
        const textX = idx === 0 ? xPosition + 2 : xPosition + 2;
        const alignment = ['#', 'Miktar', 'Birim Fiyat', 'İskonto', 'KDV', 'Toplam'].includes(headers[idx])
          ? 'right'
          : 'left';
        if (alignment === 'right') {
          pdf.text(data, xPosition + colWidths[idx] - 2, yPosition + 4.5, { align: 'right' });
        } else {
          pdf.text(data, textX, yPosition + 4.5);
        }
        xPosition += colWidths[idx];
      });

      yPosition += rowHeight;
    });

    return yPosition + 5;
  }

  private static addTotalsSection(
    pdf: jsPDF,
    proposal: Proposal,
    margin: number,
    yPosition: number
  ): number {
    const contentWidth = this.CONTENT_WIDTH;
    const totalStartX = margin + contentWidth - 80;

    pdf.setFontSize(9);

    // Subtotal
    pdf.setFont('helvetica', 'normal');
    pdf.text('Ara Toplam:', totalStartX, yPosition);
    pdf.text(this.formatCurrency(proposal.subtotal), totalStartX + 50, yPosition, { align: 'right' });
    yPosition += 5;

    // Discount
    if (proposal.discountAmount && proposal.discountAmount > 0) {
      pdf.text('İskonto:', totalStartX, yPosition);
      pdf.text(`-${this.formatCurrency(proposal.discountAmount)}`, totalStartX + 50, yPosition, {
        align: 'right',
      });
      yPosition += 5;
    }

    // Tax
    if (proposal.taxAmount && proposal.taxAmount > 0) {
      pdf.text('KDV:', totalStartX, yPosition);
      pdf.text(this.formatCurrency(proposal.taxAmount), totalStartX + 50, yPosition, { align: 'right' });
      yPosition += 5;
    }

    // Grand Total (Highlighted)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setFillColor(230, 240, 255);
    pdf.rect(totalStartX, yPosition - 2, 80, 8, 'F');
    pdf.text('GENEL TOPLAM:', totalStartX, yPosition + 3);
    pdf.text(this.formatCurrency(proposal.total), totalStartX + 50, yPosition + 3, { align: 'right' });

    return yPosition + 12;
  }

  private static addTermsSection(
    pdf: jsPDF,
    proposal: Proposal,
    margin: number,
    yPosition: number
  ): number {
    if (yPosition > this.PAGE_HEIGHT - 50) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Şartlar ve Koşullar', margin, yPosition);

    yPosition += 7;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    // Payment Terms
    if (proposal.paymentTerms) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ödeme Koşulları:', margin, yPosition);
      yPosition += 4;
      pdf.setFont('helvetica', 'normal');
      const paymentLines = pdf.splitTextToSize(proposal.paymentTerms, this.CONTENT_WIDTH);
      pdf.text(paymentLines, margin + 5, yPosition);
      yPosition += paymentLines.length * 4 + 2;
    }

    // Delivery Terms
    if (proposal.deliveryTerms) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Teslimat Koşulları:', margin, yPosition);
      yPosition += 4;
      pdf.setFont('helvetica', 'normal');
      const deliveryLines = pdf.splitTextToSize(proposal.deliveryTerms, this.CONTENT_WIDTH);
      pdf.text(deliveryLines, margin + 5, yPosition);
      yPosition += deliveryLines.length * 4 + 2;
    }

    // Notes
    if (proposal.notes) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notlar:', margin, yPosition);
      yPosition += 4;
      pdf.setFont('helvetica', 'normal');
      const noteLines = pdf.splitTextToSize(proposal.notes, this.CONTENT_WIDTH);
      pdf.text(noteLines, margin + 5, yPosition);
      yPosition += noteLines.length * 4;
    }

    return yPosition + 5;
  }

  private static addFooter(pdf: jsPDF, margin: number): void {
    const pageCount = (pdf as any).internal.pages.length - 1;
    const footerY = this.PAGE_HEIGHT - 8;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);

    // Left text
    pdf.text('TeklifPro ile oluşturuldu', margin, footerY);

    // Right text - page number
    pdf.text(`Sayfa ${1} / ${pageCount}`, this.PAGE_WIDTH - margin - 20, footerY, { align: 'right' });

    // Reset text color
    pdf.setTextColor(0, 0, 0);
  }

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
    const statusMap: Record<string, string> = {
      draft: 'Taslak',
      sent: 'Gönderildi',
      viewed: 'Görüntülendi',
      accepted: 'Kabul Edildi',
      rejected: 'Reddedildi',
      expired: 'Süresi Doldu',
    };
    return statusMap[status] || status;
  }
}
