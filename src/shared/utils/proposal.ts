import { nanoid } from 'nanoid'

/**
 * Benzersiz teklif numarasi olustur
 * Format: TKL-2026-XXXX
 */
export function generateProposalNumber(): string {
  const year = new Date().getFullYear()
  const seq = nanoid(6).toUpperCase()
  return `TKL-${year}-${seq}`
}

/**
 * Teklif public token olustur (URL-safe)
 */
export function generatePublicToken(): string {
  return nanoid(24)
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
  quantityOrItem: number | { quantity: number; unitPrice: number; discountPercent?: number; discountRate?: number; vatPercent?: number; vatRate?: number },
  unitPriceOrMode?: number | string,
  discountRate?: number
): number {
  if (typeof quantityOrItem === 'object') {
    const item = quantityOrItem
    const discount = item.discountPercent ?? item.discountRate ?? 0
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
    vatRate?: number
    vatPercent?: number
  }>,
  generalDiscount?: { type: 'PERCENTAGE' | 'FIXED' | 'percent' | 'fixed'; value: number }
) {
  let subtotal = 0
  let vatTotal = 0

  for (const item of items) {
    const dr = item.discountRate ?? item.discountPercent ?? 0
    const vr = item.vatRate ?? item.vatPercent ?? 0
    const lineTotal = calculateLineTotal(item.quantity, item.unitPrice, dr)
    subtotal += lineTotal
    vatTotal += lineTotal * (vr / 100)
  }

  let discountAmount = 0
  if (generalDiscount) {
    const discountType = generalDiscount.type.toUpperCase()
    if (discountType === 'PERCENTAGE' || discountType === 'PERCENT') {
      discountAmount = subtotal * (generalDiscount.value / 100)
    } else {
      discountAmount = generalDiscount.value
    }
  }

  const discountedSubtotal = subtotal - discountAmount
  const adjustedVat = vatTotal * (discountedSubtotal / subtotal || 0)
  const grandTotal = discountedSubtotal + adjustedVat

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    vatTotal: Math.round(adjustedVat * 100) / 100,
    vatAmount: Math.round(adjustedVat * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  }
}
