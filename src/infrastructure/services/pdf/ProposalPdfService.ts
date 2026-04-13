import { Proposal, ProposalItem } from '@/domain/entities/Proposal';
import { Tenant, BankAccount } from '@/domain/entities/Tenant';
import * as crypto from 'crypto';

/** pdfmake content node – covers text, columns, stack, table, canvas etc. */
type PdfContent = Record<string, unknown>;

/** pdfmake table layout node with table metadata */
interface PdfTableNode {
  table: { body: PdfContent[][] };
}

export interface ProposalPdfOptions {
  fontSize?: number;
  margin?: number;
}

// ── Colors ──────────────────────────────────────────
const PRIMARY = '#1E3A5F';      // Dark navy
const PRIMARY_LIGHT = '#2563EB'; // Blue-600
const ACCENT = '#0EA5E9';       // Sky-500
const TEXT_DARK = '#1E293B';     // Slate-800
const TEXT_MED = '#475569';      // Slate-600
const TEXT_LIGHT = '#94A3B8';    // Slate-400
const BORDER = '#E2E8F0';       // Slate-200
const BG_LIGHT = '#F8FAFC';     // Slate-50
const BG_ACCENT = '#EFF6FF';    // Blue-50
const WHITE = '#FFFFFF';
const RED = '#DC2626';
const GREEN = '#16A34A';

const WATERMARK_GRAY = '#D1D5DB'; // Gray-300 for watermark text

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#64748B', SENT: '#2563EB', VIEWED: '#D97706',
  ACCEPTED: '#16A34A', REJECTED: '#DC2626', REVISION_REQUESTED: '#EA580C',
  REVISED: '#7C3AED', EXPIRED: '#475569', CANCELLED: '#64748B',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak', SENT: 'Gönderildi', VIEWED: 'Görüntülendi',
  ACCEPTED: 'Kabul Edildi', REJECTED: 'Reddedildi', REVISION_REQUESTED: 'Revizyon İstendi',
  REVISED: 'Revize Edildi', EXPIRED: 'Süresi Doldu', CANCELLED: 'İptal Edildi',
};

/** Singleton pdfmake instance */
let _pdfmake: unknown = null;

function getPdfMake(): unknown {
  if (_pdfmake) return _pdfmake;
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const pdfmake = require('pdfmake/js/index') as any;
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const vfsModule = require('pdfmake/build/vfs_fonts') as any;
  const vfs: Record<string, string> = vfsModule.pdfMake ? vfsModule.pdfMake.vfs : vfsModule.vfs ?? vfsModule;
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
  _pdfmake = pdfmake;
  return pdfmake;
}

export class ProposalPdfService {
  static async generateProposalPdf(
    proposal: Proposal,
    tenant: Tenant,
    _options: ProposalPdfOptions = {}
  ): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfmake = getPdfMake() as any;
    const docDefinition = this.buildDocument(proposal, tenant);
    const doc = pdfmake.createPdf(docDefinition) as { getBuffer(): Promise<Buffer> };
    const buffer: Buffer = await doc.getBuffer();
    return buffer;
  }

  // ══════════════════════════════════════════════════
  //  DOCUMENT
  // ══════════════════════════════════════════════════
  private static buildDocument(proposal: Proposal, tenant: Tenant): PdfContent {
    const hash = this.generateHash(proposal, tenant);
    const isUnofficial = proposal.proposalType === 'UNOFFICIAL';

    const content: PdfContent[] = [
      this.buildCustomerCard(proposal),
      this.buildItemsTable(proposal.items),
      this.buildTotalsSection(proposal),
      ...this.buildTermsSection(proposal),
    ];

    // Bank account section: only for OFFICIAL proposals
    if (!isUnofficial && tenant.bankAccounts && tenant.bankAccounts.length > 0) {
      content.push(this.buildBankAccountSection(tenant.bankAccounts));
    }

    content.push(this.buildSignatureSection(tenant, hash, proposal));

    const doc: PdfContent = {
      pageSize: 'A4',
      pageMargins: [40, 120, 40, 60] as [number, number, number, number],
      defaultStyle: { font: 'Roboto', fontSize: 9, color: TEXT_DARK, lineHeight: 1.2 },
      header: (currentPage: number) => this.buildHeader(tenant, proposal, currentPage),
      footer: (currentPage: number, pageCount: number) => this.buildFooter(tenant, hash, currentPage, pageCount),
      content,
      info: {
        title: `Teklif - ${proposal.number}`,
        author: tenant.name,
        subject: `Teklif ${proposal.number}`,
        creator: 'TeklifPro',
        keywords: proposal.status === 'ACCEPTED'
          ? `imzali,hash:${hash.substring(0, 16)},tarih:${new Date().toISOString().slice(0, 10)}`
          : `teklif,hash:${hash.substring(0, 16)}`,
      },
    };

    // Watermark for UNOFFICIAL proposals
    if (isUnofficial) {
      doc.watermark = {
        text: 'TASLAK TEKLİF',
        color: WATERMARK_GRAY,
        opacity: 0.15,
        bold: true,
        fontSize: 64,
        angle: -45,
      };
    }

    return doc;
  }

  // ══════════════════════════════════════════════════
  //  HEADER
  // ══════════════════════════════════════════════════
  private static buildHeader(tenant: Tenant, proposal: Proposal, _currentPage: number): PdfContent {
    const statusText = STATUS_LABELS[proposal.status] ?? proposal.status;
    const statusColor = STATUS_COLORS[proposal.status] ?? '#64748B';

    // Left side: logo + company name (side by side)
    const companyInfoStack: PdfContent[] = [
      { text: tenant.name, fontSize: 16, bold: true, color: PRIMARY },
    ];

    const details: string[] = [];
    if (tenant.phone) details.push(tenant.phone);
    if (tenant.email) details.push(tenant.email);
    if (tenant.taxNumber) details.push(`VN: ${tenant.taxNumber}`);
    if (details.length) {
      companyInfoStack.push({ text: details.join('  •  '), fontSize: 7.5, color: TEXT_LIGHT, margin: [0, 2, 0, 0] as [number, number, number, number] });
    }
    if (tenant.address) {
      companyInfoStack.push({ text: tenant.address, fontSize: 7.5, color: TEXT_LIGHT, margin: [0, 1, 0, 0] as [number, number, number, number] });
    }

    const leftContent: PdfContent = tenant.logo
      ? {
          columns: [
            { width: 40, image: tenant.logo, fit: [36, 36] as [number, number] },
            { width: '*', stack: companyInfoStack, margin: [6, 0, 0, 0] as [number, number, number, number] },
          ],
        }
      : { stack: companyInfoStack };

    const leftStack: PdfContent[] = [leftContent];

    // Right side: proposal info
    const rightStack: PdfContent[] = [
      { text: 'TEKLİF', fontSize: 24, bold: true, color: PRIMARY, alignment: 'right' },
      { text: proposal.number, fontSize: 10, color: PRIMARY_LIGHT, alignment: 'right', margin: [0, 2, 0, 0] as [number, number, number, number] },
      {
        margin: [0, 6, 0, 0] as [number, number, number, number],
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: {
              body: [[{ text: statusText, fontSize: 8, bold: true, color: WHITE }]],
            },
            layout: {
              fillColor: () => statusColor,
              hLineWidth: () => 0, vLineWidth: () => 0,
              paddingLeft: () => 10, paddingRight: () => 10,
              paddingTop: () => 3, paddingBottom: () => 3,
            },
          },
        ],
      },
    ];

    return {
      margin: [40, 16, 40, 0] as [number, number, number, number],
      stack: [
        {
          columns: [
            { width: '*', stack: leftStack },
            { width: 180, stack: rightStack },
          ],
        },
        // Gradient-like divider line
        {
          canvas: [
            { type: 'line', x1: 0, y1: 8, x2: 515.28, y2: 8, lineWidth: 2, lineColor: PRIMARY },
            { type: 'line', x1: 0, y1: 11, x2: 515.28, y2: 11, lineWidth: 0.5, lineColor: ACCENT },
          ],
        },
        // Date row
        {
          margin: [0, 6, 0, 0] as [number, number, number, number],
          columns: [
            { text: [{ text: 'Tarih: ', color: TEXT_LIGHT, fontSize: 8 }, { text: this.formatDate(proposal.date), fontSize: 8, bold: true }] },
            { text: [{ text: 'Geçerlilik: ', color: TEXT_LIGHT, fontSize: 8 }, { text: this.formatDate(proposal.validUntil), fontSize: 8, bold: true }], alignment: 'right' },
          ],
        },
      ],
    };
  }

  // ══════════════════════════════════════════════════
  //  FOOTER
  // ══════════════════════════════════════════════════
  private static buildFooter(tenant: Tenant, hash: string, currentPage: number, pageCount: number): PdfContent {
    return {
      margin: [40, 10, 40, 0] as [number, number, number, number],
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515.28, y2: 0, lineWidth: 0.5, lineColor: BORDER }] },
        {
          margin: [0, 6, 0, 0] as [number, number, number, number],
          columns: [
            {
              width: '*',
              stack: [
                { text: `${tenant.name}  |  TeklifPro ile oluşturuldu`, fontSize: 7, color: TEXT_LIGHT },
                { text: `Doğrulama: ${hash.substring(0, 16)}  |  teklifpro.com/verify/${hash}`, fontSize: 6, color: TEXT_LIGHT, margin: [0, 1, 0, 0] as [number, number, number, number] },
              ],
            },
            { width: 'auto', text: `Sayfa ${currentPage} / ${pageCount}`, fontSize: 7, color: TEXT_LIGHT, alignment: 'right' },
          ],
        },
      ],
    };
  }

  // ══════════════════════════════════════════════════
  //  CUSTOMER CARD
  // ══════════════════════════════════════════════════
  private static buildCustomerCard(proposal: Proposal): PdfContent {
    const c = proposal.customer;

    const infoRow = (label: string, value: string) => ({
      columns: [
        { width: 70, text: label, fontSize: 8, color: TEXT_MED, bold: true },
        { width: '*', text: value, fontSize: 8.5 },
      ],
      margin: [0, 1.5, 0, 1.5] as [number, number, number, number],
    });

    const rows: PdfContent[] = [];

    // Company name with optional logo inline
    if (c.logo) {
      rows.push({
        columns: [
          { width: 70, text: 'Firma', fontSize: 8, color: TEXT_MED, bold: true },
          { width: 28, image: c.logo, fit: [24, 24] as [number, number] },
          { width: '*', text: c.companyName || c.name, fontSize: 8.5, margin: [4, 6, 0, 0] as [number, number, number, number] },
        ],
        margin: [0, 1.5, 0, 1.5] as [number, number, number, number],
      });
    } else {
      rows.push(infoRow('Firma', c.companyName || c.name));
    }

    if (c.name && c.name !== c.companyName) {
      rows.push(infoRow('İlgili', c.name));
    }
    if (c.taxNumber) rows.push(infoRow('Vergi No', c.taxNumber));
    if (c.phone) rows.push(infoRow('Telefon', c.phone));
    if (c.email) rows.push(infoRow('E-posta', c.email));
    if (c.address) rows.push(infoRow('Adres', c.address));

    return {
      stack: [
        { text: 'MÜŞTERİ BİLGİLERİ', fontSize: 9, bold: true, color: PRIMARY, margin: [0, 0, 0, 6] as [number, number, number, number] },
        {
          table: {
            widths: ['*'],
            body: [[{ stack: rows, margin: [12, 8, 12, 8] as [number, number, number, number] }]],
          },
          layout: {
            hLineWidth: () => 1, vLineWidth: () => 1,
            hLineColor: () => BORDER, vLineColor: () => BORDER,
            paddingLeft: () => 0, paddingRight: () => 0,
            paddingTop: () => 0, paddingBottom: () => 0,
          },
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    };
  }

  // ══════════════════════════════════════════════════
  //  ITEMS TABLE
  // ══════════════════════════════════════════════════
  private static buildItemsTable(items: ProposalItem[]): PdfContent {
    const headerRow = [
      { text: '#', bold: true, color: WHITE, alignment: 'center' as const, fontSize: 8 },
      { text: 'Ürün / Hizmet', bold: true, color: WHITE, fontSize: 8 },
      { text: 'Miktar', bold: true, color: WHITE, alignment: 'center' as const, fontSize: 8 },
      { text: 'Birim', bold: true, color: WHITE, alignment: 'center' as const, fontSize: 8 },
      { text: 'Birim Fiyat', bold: true, color: WHITE, alignment: 'right' as const, fontSize: 8 },
      { text: 'İskonto', bold: true, color: WHITE, alignment: 'center' as const, fontSize: 8 },
      { text: 'KDV', bold: true, color: WHITE, alignment: 'center' as const, fontSize: 8 },
      { text: 'Toplam', bold: true, color: WHITE, alignment: 'right' as const, fontSize: 8 },
    ];

    const dataRows = items.map((item, idx) => [
      { text: (idx + 1).toString(), alignment: 'center' as const, fontSize: 8, color: TEXT_MED },
      {
        stack: [
          { text: item.name, fontSize: 8.5, bold: true },
          ...(item.description ? [{ text: item.description, fontSize: 7, color: TEXT_LIGHT, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
        ],
      },
      { text: this.formatNumber(item.quantity), alignment: 'center' as const, fontSize: 8 },
      { text: item.unit, alignment: 'center' as const, fontSize: 8, color: TEXT_MED },
      { text: this.formatCurrency(item.unitPrice), alignment: 'right' as const, fontSize: 8 },
      { text: item.discount ? `%${this.formatNumber(item.discount)}` : '-', alignment: 'center' as const, fontSize: 8, color: item.discount ? RED : TEXT_LIGHT },
      { text: item.tax ? `%${this.formatNumber(item.tax)}` : '-', alignment: 'center' as const, fontSize: 8, color: TEXT_MED },
      { text: this.formatCurrency(item.total), alignment: 'right' as const, fontSize: 8.5, bold: true },
    ]);

    return {
      stack: [
        { text: 'TEKLİF KALEMLERİ', fontSize: 9, bold: true, color: PRIMARY, margin: [0, 0, 0, 6] as [number, number, number, number] },
        {
          table: {
            headerRows: 1,
            widths: [22, '*', 38, 35, 60, 40, 32, 65],
            body: [headerRow, ...dataRows],
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return PRIMARY;
              return rowIndex % 2 === 0 ? BG_LIGHT : WHITE;
            },
            hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === 1 || i === node.table.body.length ? 0 : 0.5),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 6, paddingRight: () => 6,
            paddingTop: () => 5, paddingBottom: () => 5,
          },
        },
      ],
      margin: [0, 0, 0, 8] as [number, number, number, number],
    };
  }

  // ══════════════════════════════════════════════════
  //  TOTALS
  // ══════════════════════════════════════════════════
  private static buildTotalsSection(proposal: Proposal): PdfContent {
    const isUnofficial = proposal.proposalType === 'UNOFFICIAL';
    const rows: PdfContent[][] = [];

    rows.push([
      { text: 'Ara Toplam', fontSize: 9, color: TEXT_MED, alignment: 'right' as const },
      { text: this.formatCurrency(proposal.subtotal), fontSize: 9, alignment: 'right' as const, bold: true },
    ]);

    if (proposal.discountAmount && proposal.discountAmount > 0) {
      rows.push([
        { text: 'İskonto', fontSize: 9, color: TEXT_MED, alignment: 'right' as const },
        { text: `-${this.formatCurrency(proposal.discountAmount)}`, fontSize: 9, color: RED, alignment: 'right' as const, bold: true },
      ]);
    }

    // Skip KDV row entirely for UNOFFICIAL proposals
    if (!isUnofficial && proposal.taxAmount && proposal.taxAmount > 0) {
      rows.push([
        { text: 'KDV', fontSize: 9, color: TEXT_MED, alignment: 'right' as const },
        { text: this.formatCurrency(proposal.taxAmount), fontSize: 9, alignment: 'right' as const },
      ]);
    }

    // Grand total
    rows.push([
      { text: 'GENEL TOPLAM', fontSize: 12, bold: true, color: WHITE, alignment: 'right' as const },
      { text: this.formatCurrency(proposal.total), fontSize: 12, bold: true, color: WHITE, alignment: 'right' as const },
    ]);

    return {
      columns: [
        { width: '*', text: '' },
        {
          width: 240,
          table: { widths: ['*', 'auto'], body: rows },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex === rows.length - 1 ? PRIMARY : null),
            hLineWidth: (i: number) => (i === rows.length - 1 ? 1.5 : (i === 0 ? 0 : 0.5)),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 10, paddingRight: () => 10,
            paddingTop: () => 5, paddingBottom: () => 5,
          },
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    };
  }

  // ══════════════════════════════════════════════════
  //  TERMS & CONDITIONS
  // ══════════════════════════════════════════════════
  private static buildTermsSection(proposal: Proposal): PdfContent[] {
    const hasTerms = proposal.paymentTerms || proposal.deliveryTerms || proposal.notes;
    if (!hasTerms) return [];

    const items: PdfContent[] = [];

    if (proposal.paymentTerms) {
      items.push(
        { text: 'Ödeme Koşulları', bold: true, fontSize: 8.5, color: PRIMARY, margin: [0, 4, 0, 2] as [number, number, number, number] },
        { text: proposal.paymentTerms, fontSize: 8.5, color: TEXT_MED, margin: [0, 0, 0, 6] as [number, number, number, number] },
      );
    }
    if (proposal.deliveryTerms) {
      items.push(
        { text: 'Teslimat Koşulları', bold: true, fontSize: 8.5, color: PRIMARY, margin: [0, 4, 0, 2] as [number, number, number, number] },
        { text: proposal.deliveryTerms, fontSize: 8.5, color: TEXT_MED, margin: [0, 0, 0, 6] as [number, number, number, number] },
      );
    }
    if (proposal.notes) {
      items.push(
        { text: 'Notlar', bold: true, fontSize: 8.5, color: PRIMARY, margin: [0, 4, 0, 2] as [number, number, number, number] },
        { text: proposal.notes, fontSize: 8.5, color: TEXT_MED },
      );
    }

    return [
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'ŞARTLAR VE KOŞULLAR', fontSize: 9, bold: true, color: PRIMARY, margin: [0, 0, 0, 4] as [number, number, number, number] },
              ...items,
            ],
            margin: [12, 10, 12, 10] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 1, vLineWidth: () => 1,
          hLineColor: () => BORDER, vLineColor: () => BORDER,
          hLineStyle: () => ({ dash: { length: 3, space: 2 } }),
          vLineStyle: () => ({ dash: { length: 3, space: 2 } }),
          paddingLeft: () => 0, paddingRight: () => 0,
          paddingTop: () => 0, paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
    ];
  }

  // ══════════════════════════════════════════════════
  //  SIGNATURE SECTION (Company + Customer)
  // ══════════════════════════════════════════════════
  private static buildSignatureSection(tenant: Tenant, hash: string, proposal?: Proposal): PdfContent {
    const hasCompanySig = proposal?.companySignature?.data;
    const hasCustomerSig = proposal?.customerSignature?.data;
    const hasSeal = proposal?.companySeal;
    const isAccepted = proposal?.status === 'ACCEPTED';

    // Build company signature column
    const companyCol: PdfContent[] = [
      { text: 'FİRMA İMZASI', fontSize: 8, bold: true, color: PRIMARY, margin: [0, 0, 0, 6] as [number, number, number, number] },
    ];
    if (hasCompanySig) {
      companyCol.push({ image: proposal!.companySignature!.data, fit: [120, 60] as [number, number], margin: [0, 0, 0, 4] as [number, number, number, number] });
    }
    if (hasSeal) {
      companyCol.push({ image: proposal!.companySeal!, fit: [50, 50] as [number, number], margin: [0, 2, 0, 4] as [number, number, number, number] });
    }
    if (!hasCompanySig && !hasSeal) {
      companyCol.push({ text: '________________________', fontSize: 9, color: TEXT_LIGHT, margin: [0, 20, 0, 4] as [number, number, number, number] });
    }
    const signerName = proposal?.companySignature?.signerName || tenant.companySignerName;
    const signerTitle = proposal?.companySignature?.signerTitle || tenant.companySignerTitle;
    if (signerName) companyCol.push({ text: signerName, fontSize: 8, bold: true, color: TEXT_DARK });
    if (signerTitle) companyCol.push({ text: signerTitle, fontSize: 7, color: TEXT_MED });
    companyCol.push({ text: tenant.name, fontSize: 7, color: TEXT_LIGHT, margin: [0, 2, 0, 0] as [number, number, number, number] });

    // Build customer signature column
    const customerCol: PdfContent[] = [
      { text: 'MÜŞTERİ İMZASI', fontSize: 8, bold: true, color: PRIMARY, margin: [0, 0, 0, 6] as [number, number, number, number] },
    ];
    if (hasCustomerSig && isAccepted) {
      customerCol.push({ image: proposal!.customerSignature!.data, fit: [120, 60] as [number, number], margin: [0, 0, 0, 4] as [number, number, number, number] });
      if (proposal!.customerSignature!.signerName) {
        customerCol.push({ text: proposal!.customerSignature!.signerName, fontSize: 8, bold: true, color: TEXT_DARK });
      }
      if (proposal!.customerSignature!.signedAt) {
        const signedDate = new Date(proposal!.customerSignature!.signedAt).toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        customerCol.push({ text: `İmza Tarihi: ${signedDate}`, fontSize: 7, color: TEXT_MED, margin: [0, 2, 0, 0] as [number, number, number, number] });
      }
      customerCol.push({ text: '✓ Dijital olarak imzalanmıştır', fontSize: 7, bold: true, color: GREEN, margin: [0, 4, 0, 0] as [number, number, number, number] });
    } else {
      customerCol.push({ text: '________________________', fontSize: 9, color: TEXT_LIGHT, margin: [0, 20, 0, 4] as [number, number, number, number] });
      customerCol.push({ text: proposal?.customer?.name || '', fontSize: 8, bold: true, color: TEXT_DARK });
    }

    // Signature block
    const signatureBlock: PdfContent = {
      table: {
        widths: ['*', '*'],
        body: [[
          { stack: companyCol, margin: [12, 10, 12, 10] as [number, number, number, number] },
          { stack: customerCol, margin: [12, 10, 12, 10] as [number, number, number, number] },
        ]],
      },
      layout: {
        hLineWidth: () => 1, vLineWidth: (i: number) => (i === 1 ? 0.5 : 1),
        hLineColor: () => BORDER, vLineColor: () => BORDER,
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 8] as [number, number, number, number],
    };

    // Verification block
    const verificationBlock: PdfContent = {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            {
              columns: [
                {
                  width: '*',
                  stack: [
                    { text: 'DİJİTAL DOĞRULAMA', fontSize: 8, bold: true, color: PRIMARY },
                    { text: 'Bu belge TeklifPro tarafından dijital olarak oluşturulmuştur.', fontSize: 7, color: TEXT_MED, margin: [0, 2, 0, 0] as [number, number, number, number] },
                    { text: 'Belge bütünlüğü aşağıdaki doğrulama kodu ile kontrol edilebilir.', fontSize: 7, color: TEXT_MED, margin: [0, 1, 0, 0] as [number, number, number, number] },
                  ],
                },
                {
                  width: 'auto',
                  stack: [
                    { text: isAccepted ? '✓ İMZALANMIŞ' : '✓ DOĞRULANMIŞ', fontSize: 9, bold: true, color: GREEN, alignment: 'right' as const },
                    { text: tenant.name, fontSize: 7, color: TEXT_MED, alignment: 'right' as const, margin: [0, 2, 0, 0] as [number, number, number, number] },
                  ],
                },
              ],
            },
            {
              margin: [0, 8, 0, 0] as [number, number, number, number],
              table: {
                widths: ['*'],
                body: [[{
                  text: hash,
                  fontSize: 7,
                  font: 'Roboto',
                  color: TEXT_MED,
                  alignment: 'center' as const,
                  margin: [8, 4, 8, 4] as [number, number, number, number],
                }]],
              },
              layout: {
                fillColor: () => BG_LIGHT,
                hLineWidth: () => 0.5, vLineWidth: () => 0.5,
                hLineColor: () => BORDER, vLineColor: () => BORDER,
                paddingLeft: () => 0, paddingRight: () => 0,
                paddingTop: () => 0, paddingBottom: () => 0,
              },
            },
          ],
          margin: [12, 10, 12, 10] as [number, number, number, number],
        }]],
      },
      layout: {
        fillColor: () => BG_ACCENT,
        hLineWidth: () => 1, vLineWidth: () => 1,
        hLineColor: () => '#BFDBFE', vLineColor: () => '#BFDBFE',
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
    };

    return { stack: [signatureBlock, verificationBlock] };
  }

  // ══════════════════════════════════════════════════
  //  BANK ACCOUNTS (only shown for OFFICIAL proposals)
  // ══════════════════════════════════════════════════
  private static buildBankAccountSection(bankAccounts: BankAccount[]): PdfContent {
    const rows: PdfContent[][] = bankAccounts.map((account) => {
      const parts: PdfContent[] = [
        { text: account.bankName, fontSize: 8.5, bold: true, color: TEXT_DARK },
      ];
      if (account.branchName) {
        parts.push({ text: ` - ${account.branchName}`, fontSize: 8, color: TEXT_MED });
      }

      const details: PdfContent[] = [
        { text: parts, margin: [0, 0, 0, 2] as [number, number, number, number] },
        {
          columns: [
            { width: 50, text: 'IBAN:', fontSize: 8, color: TEXT_MED, bold: true },
            { width: '*', text: account.iban, fontSize: 8.5, color: TEXT_DARK },
          ],
        },
      ];

      if (account.accountHolder) {
        details.push({
          columns: [
            { width: 50, text: 'Hesap:', fontSize: 8, color: TEXT_MED, bold: true },
            { width: '*', text: account.accountHolder, fontSize: 8, color: TEXT_DARK },
          ],
        });
      }

      if (account.currency && account.currency !== 'TRY') {
        details.push({
          columns: [
            { width: 50, text: 'Döviz:', fontSize: 8, color: TEXT_MED, bold: true },
            { width: '*', text: account.currency, fontSize: 8, color: TEXT_DARK },
          ],
        });
      }

      return [{ stack: details, margin: [12, 6, 12, 6] as [number, number, number, number] }];
    });

    return {
      stack: [
        { text: 'BANKA HESAP BİLGİLERİ', fontSize: 9, bold: true, color: PRIMARY, margin: [0, 0, 0, 6] as [number, number, number, number] },
        {
          table: {
            widths: ['*'],
            body: rows,
          },
          layout: {
            hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
            vLineWidth: () => 1,
            hLineColor: () => BORDER,
            vLineColor: () => BORDER,
            paddingLeft: () => 0, paddingRight: () => 0,
            paddingTop: () => 0, paddingBottom: () => 0,
          },
        },
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number],
    };
  }

  // ══════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════
  static generateHash(proposal: Proposal, tenant: Tenant): string {
    const data = `${tenant.id}:${proposal.number}:${proposal.total}:${proposal.customer.name}:${proposal.items.length}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private static formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);
  }

  private static formatNumber(num: number): string {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
  }
}
