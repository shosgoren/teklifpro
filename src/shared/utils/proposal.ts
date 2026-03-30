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
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountRate: number
): number {
  const subtotal = quantity * unitPrice
  const discount = subtotal * (discountRate / 100)
  return subtotal - discount
}

/**
 * Teklif genel toplamlari hesapla
 */
export function calculateProposalTotals(
  items: Array<{
    quantity: number
    unitPrice: number
    discountRate: number
    vatRate: number
  }>,
  generalDiscount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }
) {
  let subtotal = 0
  let vatTotal = 0

  for (const item of items) {
    const lineTotal = calculateLineTotal(item.quantity, item.unitPrice, item.discountRate)
    subtotal += lineTotal
    vatTotal += lineTotal * (item.vatRate / 100)
  }

  let discountAmount = 0
  if (generalDiscount) {
    if (generalDiscount.type === 'PERCENTAGE') {
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
    grandTotal: Math.round(grandTotal * 100) / 100,
  }
}
