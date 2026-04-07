import { randomBytes } from 'crypto';

/**
 * Generates a unique proposal number with format: TKL-YYYYMM-XXXX
 * Uses crypto.randomBytes for secure random generation.
 */
export function generateProposalNumber(): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(randomBytes(2).readUInt16BE(0) % 10000).padStart(4, '0');
  return `TKL-${yearMonth}-${seq}`;
}

/**
 * Generates a random public token for sharing proposals
 */
export function generatePublicToken(): string {
  return randomBytes(32).toString('hex');
}
