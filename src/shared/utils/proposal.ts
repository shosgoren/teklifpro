/**
 * Benzersiz teklif numarasi olustur
 * Format: TKL-YYYYMM-XXXX
 */
export function generateProposalNumber(): string {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `TKL-${yearMonth}-${seq}`
}

/**
 * Teklif public token olustur (URL-safe)
 */
export function generatePublicToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Para formatla (Turkce)
 */
export function formatCurrency(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Teklif satirinin toplam tutarini hesapla
 * Accepts either (quantity, unitPrice, discountRate) or (item, mode)
 */
export function calculateLineTotal(
  quantityOrItem: number | { quantity: number; unitPrice: number; discountPercent?: number; discountRate?: number; discount?: number; vatPercent?: number; vatRate?: number },
  unitPriceOrMode?: number | string,
  discountRate?: number
): number {
  if (typeof quantityOrItem === 'object') {
    const item = quantityOrItem
    const discount = item.discountPercent ?? item.discountRate ?? item.discount ?? 0
    const vat = item.vatPercent ?? item.vatRate ?? 0
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = subtotal * (discount / 100)
    const afterDiscount = subtotal - discountAmount
    if (unitPriceOrMode === 'with_vat') {
      return afterDiscount + (afterDiscount * (vat / 100))
    }
    return afterDiscount
  }

  // Original 3-arg signature
  const quantity = quantityOrItem
  const unitPrice = unitPriceOrMode as number
  const dr = discountRate ?? 0
  const subtotal = quantity * unitPrice
  const discount = subtotal * (dr / 100)
  return subtotal - discount
}

/**
 * Teklif genel toplamlari hesapla
 */
export function calculateProposalTotals(
  items: Array<{
    quantity: number
    unitPrice: number
    discountRate?: number
    discountPercent?: number
    discount?: number
    vatRate?: number
    vatPercent?: number
  }>,
  generalDiscount?: number | { type: 'PERCENTAGE' | 'FIXED' | 'percent' | 'fixed'; value: number }
) {
  let subtotal = 0
  let vatTotal = 0

  for (const item of items) {
    const dr = item.discountRate ?? item.discountPercent ?? item.discount ?? 0
    const vr = item.vatRate ?? item.vatPercent ?? 20
    const lineTotal = calculateLineTotal(item.quantity, item.unitPrice, dr)
    subtotal += lineTotal
    vatTotal += lineTotal * (vr / 100)
  }

  let discountAmount = 0
  if (typeof generalDiscount === 'number') {
    discountAmount = generalDiscount
  } else if (generalDiscount) {
    const discountType = generalDiscount.type.toUpperCase()
    if (discountType === 'PERCENTAGE' || discountType === 'PERCENT') {
      discountAmount = subtotal * (generalDiscount.value / 100)
    } else {
      discountAmount = generalDiscount.value
    }
  }

  const discountedSubtotal = subtotal - discountAmount
  const adjustedVat = subtotal > 0 ? vatTotal * (discountedSubtotal / subtotal) : 0
  const grandTotal = discountedSubtotal + adjustedVat

  return {
    subtotal,
    discountAmount,
    discount: discountAmount,
    vatTotal: adjustedVat,
    vatAmount: adjustedVat,
    tax: adjustedVat,
    grandTotal,
  }
}
