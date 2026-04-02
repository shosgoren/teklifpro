/* eslint-disable @typescript-eslint/no-explicit-any */
import { Proposal, ProposalItem } from '@/domain/entities/Proposal';
import { Tenant } from '@/domain/entities/Tenant';

export interface ProposalPdfOptions {
  fontSize?: number;
  margin?: number;
}

// ── Colors (hex) ──────────────────────────────────────────
const BRAND_PRIMARY = '#2563EB'; // Blue-600
const BRAND_DARK = '#1E40AF'; // Blue-800
const TEXT_PRIMARY = '#111827'; // Gray-900
const TEXT_SECONDARY = '#6B7280'; // Gray-500
const BORDER_COLOR = '#E5E7EB'; // Gray-200
const BG_LIGHT = '#F9FAFB'; // Gray-50
const WHITE = '#FFFFFF';
const RED = '#DC2626'; // Red-600

// Status color map
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6B7280',
  SENT: '#2563EB',
  VIEWED: '#EAB308',
  ACCEPTED: '#16A34A',
  REJECTED: '#DC2626',
  REVISION_REQUESTED: '#EA580C',
  REVISED: '#9333EA',
  EXPIRED: '#475569',
  CANCELLED: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
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

/** Singleton: pdfmake instance with Roboto fonts loaded (lazy-initialized). */
let _pdfmakeInstance: any = null;

function getPdfMake(): any {
  if (_pdfmakeInstance) return _pdfmakeInstance;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfmake = require('pdfmake/js/index') as any;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfsModule = require('pdfmake/build/vfs_fonts') as any;
  const vfs: Record<string, string> = vfsModule.pdfMake
    ? vfsModule.pdfMake.vfs
    : vfsModule.vfs ?? vfsModule;

  // Decode base64-encoded font files and load into pdfmake virtual filesystem
  for (const [filename, base64Data] of Object.entries(vfs)) {
    pdfmake.virtualfs.writeFileSync(filename, Buffer.from(base64Data, 'base64'));
  }

  pdfmake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };

  _pdfmakeInstance = pdfmake;
  return pdfmake;
}

export class ProposalPdfService {
  /**
   * Generates a premium PDF proposal document.
   * Uses pdfmake with built-in Roboto font for full Unicode/Turkish support.
   */
  static async generateProposalPdf(
    proposal: Proposal,
    tenant: Tenant,
    _options: ProposalPdfOptions = {}
  ): Promise<Buffer> {
    const pdfmake = getPdfMake();
    const docDefinition = this.buildDocDefinition(proposal, tenant);
    const doc = pdfmake.createPdf(docDefinition);
    const buffer: Buffer = await doc.getBuffer();
    return buffer;
  }

  // ──────────────────────────────────────────────
  //  DOCUMENT DEFINITION
  // ──────────────────────────────────────────────
  private static buildDocDefinition(proposal: Proposal, tenant: Tenant): any {
    return {
      pageSize: 'A4',
      pageMargins: [40, 120, 40, 60] as [number, number, number, number],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        color: TEXT_PRIMARY,
      },
      header: this.buildHeader(tenant),
      footer: this.buildFooter(tenant),
      content: [
        this.buildInfoBoxRow(proposal),
        { text: '', margin: [0, 10, 0, 0] as [number, number, number, number] },
        this.buildCustomerSection(proposal),
        { text: '', margin: [0, 10, 0, 0] as [number, number, number, number] },
        this.buildItemsTable(proposal.items),
        { text: '', margin: [0, 8, 0, 0] as [number, number, number, number] },
        this.buildTotalsSection(proposal),
        ...this.buildTermsSection(proposal),
      ],
    };
  }

  // ──────────────────────────────────────────────
  //  HEADER (on every page)
  // ──────────────────────────────────────────────
  private static buildHeader(tenant: Tenant): any {
    const details: string[] = [];
    if (tenant.email) details.push(tenant.email);
    if (tenant.phone) details.push(tenant.phone);
    if (tenant.taxNumber) details.push(`VN: ${tenant.taxNumber}`);
    const detailLine = details.join('  |  ');

    return {
      margin: [0, 0, 0, 0] as [number, number, number, number],
      stack: [
        // Blue header bar
        {
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 595.28, // A4 width in points
              h: 80,
              color: BRAND_PRIMARY,
            },
          ],
        },
        // Content overlaid on the blue bar
        {
          margin: [40, -70, 40, 0] as [number, number, number, number],
          columns: [
            {
              width: '*',
              stack: [
                {
                  text: tenant.name,
                  fontSize: 20,
                  bold: true,
                  color: WHITE,
                },
                ...(detailLine
                  ? [
                      {
                        text: detailLine,
                        fontSize: 8,
                        color: '#BFDBFE', // Blue-200
                        margin: [0, 3, 0, 0] as [number, number, number, number],
                      },
                    ]
                  : []),
                ...(tenant.address
                  ? [
                      {
                        text: tenant.address,
                        fontSize: 8,
                        color: '#BFDBFE',
                        margin: [0, 2, 0, 0] as [number, number, number, number],
                      },
                    ]
                  : []),
              ],
            },
            {
              width: 'auto',
              stack: [
                {
                  text: 'TEKLİF',
                  fontSize: 18,
                  bold: true,
                  color: WHITE,
                  alignment: 'right',
                },
              ],
            },
          ],
        },
      ],
    };
  }

  // ──────────────────────────────────────────────
  //  FOOTER (on every page)
  // ──────────────────────────────────────────────
  private static buildFooter(tenant: Tenant): any {
    return (currentPage: number, pageCount: number) => ({
      margin: [40, 10, 40, 0] as [number, number, number, number],
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 515.28,
              y2: 0,
              lineWidth: 0.5,
              lineColor: BORDER_COLOR,
            },
          ],
        },
        {
          margin: [0, 5, 0, 0] as [number, number, number, number],
          columns: [
            {
              text: `${tenant.name}  |  TeklifPro ile oluşturuldu`,
              fontSize: 7,
              color: TEXT_SECONDARY,
            },
            {
              text: `Sayfa ${currentPage} / ${pageCount}`,
              fontSize: 7,
              color: TEXT_SECONDARY,
              alignment: 'right',
            },
          ],
        },
      ],
    });
  }

  // ──────────────────────────────────────────────
  //  INFO BOX ROW
  // ──────────────────────────────────────────────
  private static buildInfoBoxRow(proposal: Proposal): any {
    const statusText =
      STATUS_LABELS[proposal.status] ??
      STATUS_LABELS[proposal.status?.toUpperCase()] ??
      proposal.status;
    const statusColor =
      STATUS_COLORS[proposal.status] ??
      STATUS_COLORS[proposal.status?.toUpperCase()] ??
      '#6B7280';

    const infoCell = (label: string, value: string) => ({
      stack: [
        { text: label, fontSize: 7, color: TEXT_SECONDARY, margin: [0, 0, 0, 2] as [number, number, number, number] },
        { text: value, fontSize: 10, bold: true, color: TEXT_PRIMARY },
      ],
    });

    return {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            infoCell('Teklif No', proposal.number),
            infoCell('Tarih', this.formatDate(proposal.date)),
            infoCell('Geçerlilik', this.formatDate(proposal.validUntil)),
            {
              stack: [
                {
                  text: 'Durum',
                  fontSize: 7,
                  color: TEXT_SECONDARY,
                  margin: [0, 0, 0, 2] as [number, number, number, number],
                },
                {
                  table: {
                    body: [
                      [
                        {
                          text: statusText,
                          fontSize: 8,
                          bold: true,
                          color: WHITE,
                        },
                      ],
                    ],
                  },
                  layout: {
                    fillColor: () => statusColor,
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                    paddingTop: () => 2,
                    paddingBottom: () => 2,
                  },
                },
              ],
            },
          ],
        ],
      },
      layout: {
        fillColor: () => BG_LIGHT,
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 10,
        paddingRight: () => 10,
        paddingTop: () => 8,
        paddingBottom: () => 8,
      },
    };
  }

  // ──────────────────────────────────────────────
  //  CUSTOMER SECTION
  // ──────────────────────────────────────────────
  private static buildCustomerSection(proposal: Proposal): any {
    const c = proposal.customer;

    // Build rows of label-value pairs
    const rows: Array<[string, string, string, string]> = [];

    rows.push([
      'Firma:',
      c.companyName || c.name,
      c.taxNumber ? 'Vergi No:' : '',
      c.taxNumber ?? '',
    ]);

    if (c.name && c.name !== c.companyName) {
      rows.push([
        'İlgili:',
        c.name,
        c.title ? 'Ünvan:' : '',
        c.title ?? '',
      ]);
    }

    if (c.phone || c.email) {
      rows.push([
        c.phone ? 'Telefon:' : '',
        c.phone ?? '',
        c.email ? 'E-posta:' : '',
        c.email ?? '',
      ]);
    }

    if (c.address) {
      rows.push(['Adres:', c.address, '', '']);
    }

    const tableBody = rows.map((row) => [
      { text: row[0], bold: true, fontSize: 9 },
      { text: row[1], fontSize: 9 },
      { text: row[2], bold: true, fontSize: 9 },
      { text: row[3], fontSize: 9 },
    ]);

    return {
      stack: [
        // Section title bar
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: 'Müşteri Bilgileri',
                  bold: true,
                  fontSize: 11,
                  color: WHITE,
                },
              ],
            ],
          },
          layout: {
            fillColor: () => BRAND_DARK,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },
        // Customer data table
        {
          table: {
            widths: [55, '*', 55, '*'],
            body: tableBody,
          },
          layout: {
            hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
            vLineWidth: () => 0,
            hLineColor: () => BORDER_COLOR,
            paddingLeft: () => 8,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 2, 0, 0] as [number, number, number, number],
        },
      ],
    };
  }

  // ──────────────────────────────────────────────
  //  ITEMS TABLE
  // ──────────────────────────────────────────────
  private static buildItemsTable(items: ProposalItem[]): any {
    const headerRow = [
      { text: '#', bold: true, color: WHITE, alignment: 'center', fontSize: 8 },
      { text: 'Ürün / Hizmet', bold: true, color: WHITE, fontSize: 8 },
      { text: 'Miktar', bold: true, color: WHITE, alignment: 'right', fontSize: 8 },
      { text: 'Birim', bold: true, color: WHITE, fontSize: 8 },
      { text: 'Birim Fiyat', bold: true, color: WHITE, alignment: 'right', fontSize: 8 },
      { text: 'İskonto', bold: true, color: WHITE, alignment: 'right', fontSize: 8 },
      { text: 'KDV', bold: true, color: WHITE, alignment: 'right', fontSize: 8 },
      { text: 'Toplam', bold: true, color: WHITE, alignment: 'right', fontSize: 8 },
    ];

    const dataRows = items.map((item, idx) => [
      { text: (idx + 1).toString(), alignment: 'center', fontSize: 8 },
      {
        stack: [
          { text: item.name, fontSize: 8 },
          ...(item.description
            ? [{ text: item.description, fontSize: 7, color: TEXT_SECONDARY }]
            : []),
        ],
      },
      { text: this.formatNumber(item.quantity), alignment: 'right', fontSize: 8 },
      { text: item.unit, fontSize: 8 },
      { text: this.formatCurrency(item.unitPrice), alignment: 'right', fontSize: 8 },
      {
        text: item.discount ? `%${this.formatNumber(item.discount)}` : '-',
        alignment: 'right',
        fontSize: 8,
      },
      {
        text: item.tax ? `%${this.formatNumber(item.tax)}` : '-',
        alignment: 'right',
        fontSize: 8,
      },
      {
        text: this.formatCurrency(item.total),
        alignment: 'right',
        fontSize: 8,
        bold: true,
      },
    ]);

    return {
      stack: [
        // Section title bar
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: 'Teklif Kalemleri',
                  bold: true,
                  fontSize: 11,
                  color: WHITE,
                },
              ],
            ],
          },
          layout: {
            fillColor: () => BRAND_DARK,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },
        // Items table
        {
          table: {
            headerRows: 1,
            widths: [20, '*', 40, 35, 55, 40, 30, 60],
            body: [headerRow, ...dataRows],
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return BRAND_PRIMARY;
              return rowIndex % 2 === 0 ? BG_LIGHT : null;
            },
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === node.table.body.length ? 0 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => BORDER_COLOR,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 2, 0, 0] as [number, number, number, number],
        },
      ],
    };
  }

  // ──────────────────────────────────────────────
  //  TOTALS SECTION
  // ──────────────────────────────────────────────
  private static buildTotalsSection(proposal: Proposal): any {
    const rows: any[][] = [];

    rows.push([
      { text: 'Ara Toplam:', fontSize: 9, color: TEXT_SECONDARY, alignment: 'right' },
      { text: this.formatCurrency(proposal.subtotal), fontSize: 9, alignment: 'right' },
    ]);

    if (proposal.discountAmount && proposal.discountAmount > 0) {
      rows.push([
        { text: 'İskonto:', fontSize: 9, color: TEXT_SECONDARY, alignment: 'right' },
        {
          text: `-${this.formatCurrency(proposal.discountAmount)}`,
          fontSize: 9,
          color: RED,
          alignment: 'right',
        },
      ]);
    }

    if (proposal.taxAmount && proposal.taxAmount > 0) {
      rows.push([
        { text: 'KDV:', fontSize: 9, color: TEXT_SECONDARY, alignment: 'right' },
        { text: this.formatCurrency(proposal.taxAmount), fontSize: 9, alignment: 'right' },
      ]);
    }

    // Grand total row
    rows.push([
      { text: 'GENEL TOPLAM', fontSize: 11, bold: true, color: WHITE, alignment: 'right' },
      {
        text: this.formatCurrency(proposal.total),
        fontSize: 11,
        bold: true,
        color: WHITE,
        alignment: 'right',
      },
    ]);

    return {
      columns: [
        { width: '*', text: '' },
        {
          width: 220,
          table: {
            widths: ['*', 'auto'],
            body: rows,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              return rowIndex === rows.length - 1 ? BRAND_PRIMARY : null;
            },
            hLineWidth: (i: number) => {
              return i === rows.length - 1 ? 1 : 0;
            },
            vLineWidth: () => 0,
            hLineColor: () => BRAND_PRIMARY,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        },
      ],
    };
  }

  // ──────────────────────────────────────────────
  //  TERMS & CONDITIONS
  // ──────────────────────────────────────────────
  private static buildTermsSection(proposal: Proposal): any[] {
    const hasTerms = proposal.paymentTerms || proposal.deliveryTerms || proposal.notes;
    if (!hasTerms) return [];

    const termItems: any[] = [];

    if (proposal.paymentTerms) {
      termItems.push(
        { text: 'Ödeme Koşulları', bold: true, fontSize: 9, margin: [0, 4, 0, 2] as [number, number, number, number] },
        { text: proposal.paymentTerms, fontSize: 9, margin: [8, 0, 0, 4] as [number, number, number, number] }
      );
    }

    if (proposal.deliveryTerms) {
      termItems.push(
        { text: 'Teslimat Koşulları', bold: true, fontSize: 9, margin: [0, 4, 0, 2] as [number, number, number, number] },
        { text: proposal.deliveryTerms, fontSize: 9, margin: [8, 0, 0, 4] as [number, number, number, number] }
      );
    }

    if (proposal.notes) {
      termItems.push(
        { text: 'Notlar', bold: true, fontSize: 9, margin: [0, 4, 0, 2] as [number, number, number, number] },
        { text: proposal.notes, fontSize: 9, margin: [8, 0, 0, 0] as [number, number, number, number] }
      );
    }

    return [
      { text: '', margin: [0, 12, 0, 0] as [number, number, number, number] },
      {
        stack: [
          // Section title bar
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: 'Şartlar ve Koşullar',
                    bold: true,
                    fontSize: 11,
                    color: WHITE,
                  },
                ],
              ],
            },
            layout: {
              fillColor: () => BRAND_DARK,
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 8,
              paddingRight: () => 8,
              paddingTop: () => 5,
              paddingBottom: () => 5,
            },
          },
          // Terms content
          {
            stack: termItems,
            margin: [8, 6, 0, 0] as [number, number, number, number],
          },
        ],
      },
    ];
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
}
