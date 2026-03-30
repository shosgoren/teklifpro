import { randomBytes } from 'crypto';

/**
 * Generates a unique proposal number with format: PRO-YYYYMMDD-XXXX
 */
export function generateProposalNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PRO-${dateStr}-${random}`;
}

/**
 * Generates a random public token for sharing proposals
 */
export function generatePublicToken(): string {
  return randomBytes(32).toString('hex');
}
