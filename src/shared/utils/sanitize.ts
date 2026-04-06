/**
 * Input Sanitization Utilities
 * Defense-in-depth approach to prevent XSS, SQL injection, and data validation
 * All functions are synchronous and safe for use in both client and server contexts
 */

/**
 * Strip HTML tags and dangerous content to prevent XSS attacks
 * Uses a whitelist approach for maximum security
 * @param input The input string to sanitize
 * @returns Sanitized string with HTML tags removed
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  const SAFE_TAGS = ['p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

  let result = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<embed\b[^<]*>/gi, '') // Remove embed tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers with double quotes
    .replace(/on\w+\s*=\s*'[^']*'/gi, '') // Remove event handlers with single quotes
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/style\s*=\s*"[^"]*"/gi, '') // Remove style attributes with double quotes
    .replace(/style\s*=\s*'[^']*'/gi, ''); // Remove style attributes with single quotes

  // Build whitelist regex: remove tags that are NOT in the safe list
  const safeTagPattern = SAFE_TAGS.join('|');
  // Remove closing tags that are not safe
  result = result.replace(new RegExp(`<\\/(?!(?:${safeTagPattern})\\s*>)[^>]+>`, 'gi'), '');
  // Remove opening/self-closing tags that are not safe
  result = result.replace(new RegExp(`<(?!(?:${safeTagPattern})(?:\\s|>|\\/))(?!\\/)[^>]+>`, 'gi'), '');

  return result;
}

/**
 * Trim whitespace and remove control characters
 * Prevents null byte injections and other control character exploits
 * @param input The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers (double quotes)
    .replace(/on\w+\s*=\s*'[^']*'/gi, '') // Remove event handlers (single quotes)
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '') // Remove event handlers (unquoted)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/<[^>]+>/g, ''); // Remove all HTML tags
}

/**
 * Sanitize email addresses
 * Converts to lowercase, trims, validates basic format
 * @param email The email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  const sanitized = email
    .toLowerCase()
    .trim()
    .replace(/\s/g, '');

  // Basic RFC 5322 email validation (simplified for common cases)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  // Limit email length (RFC allows max 320 chars, but we use practical limit)
  if (sanitized.length > 254) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize Turkish phone numbers
 * Removes non-numeric characters except + (international prefix)
 * Validates Turkish phone format
 * @param phone The phone number to sanitize
 * @returns Sanitized phone number or empty string if invalid format
 */
export function sanitizePhone(phone: string | null | undefined): string | null | undefined {
  if (phone === null) return null;
  if (phone === undefined) return undefined;
  if (typeof phone !== 'string') {
    return '';
  }

  if (phone.trim() === '') return '';

  // Remove whitespace and dashes, keep only digits and +
  const sanitized = phone
    .trim()
    .replace(/[\s\-().]/g, '');

  // Normalize: if starts with +90, convert to 0 prefix
  let normalized = sanitized;
  if (normalized.startsWith('+90')) {
    normalized = '0' + normalized.slice(3);
  }

  // Validate format
  if (/^05\d{9}$/.test(normalized)) {
    return normalized;
  }

  // Return cleaned digits even if not perfectly valid
  return sanitized.replace(/[^\d]/g, '');
}

/**
 * Sanitize an entire object's string fields
 * Applies sanitizeInput to specified fields of an object
 * @param obj The object to sanitize
 * @param fields Array of field names to sanitize
 * @returns New object with sanitized fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const field of fields) {
    if (field in sanitized && typeof sanitized[field] === 'string') {
      (sanitized[field as keyof T] as unknown) = sanitizeInput(
        sanitized[field as keyof T] as string
      );
    }
  }

  return sanitized;
}

/**
 * Escape special SQL characters for defense-in-depth
 * NOTE: This is NOT a substitute for parameterized queries
 * Always use parameterized queries/prepared statements when available
 * This provides additional protection as a secondary measure
 * @param input The input string to escape
 * @returns Escaped string safe for SQL contexts
 */
export function escapeForDb(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/\\/g, '\\\\') // Backslash
    .replace(/'/g, "''") // Single quote
    .replace(/"/g, '\\"') // Double quote
    .replace(/\x00/g, '\\0') // Null byte
    .replace(/\n/g, '\\n') // Newline
    .replace(/\r/g, '\\r') // Carriage return
    .replace(/\x1a/g, '\\Z'); // Ctrl+Z
}

/**
 * Validate Turkish tax identification number (Vergi Kimlik Numarası - VKN)
 * Can be 10 digits (for individuals using TC number) or 11 digits (for businesses)
 * @param taxNumber The tax number to validate
 * @returns True if valid format
 */
export function isValidTurkishTaxNumber(taxNumber: string): boolean {
  if (typeof taxNumber !== 'string') {
    return false;
  }

  const sanitized = taxNumber.replace(/\s/g, '');

  // VKN can be 10 digits (TC number) or 11 digits (business)
  if (!/^\d{10,11}$/.test(sanitized)) {
    return false;
  }

  // Basic checksum validation for 10-digit (TC) numbers
  if (sanitized.length === 10) {
    let sum = 0;
    let product = 1;

    for (let i = 0; i < 9; i++) {
      product = (parseInt(sanitized[i]) * (2 ** (9 - i))) % 11;
      sum += product;
    }

    const checkDigit = sum % 11;
    return parseInt(sanitized[9]) === checkDigit;
  }

  // For 11-digit numbers (business), perform business checksum
  if (sanitized.length === 11) {
    let oddSum = 0;
    let evenSum = 0;

    for (let i = 0; i < 10; i++) {
      const digit = parseInt(sanitized[i]);
      if (i % 2 === 0) {
        oddSum += digit;
      } else {
        evenSum += digit;
      }
    }

    const checkDigit =
      (oddSum * 7 - evenSum) % 11 === 10 ? 0 : (oddSum * 7 - evenSum) % 11;
    return parseInt(sanitized[10]) === checkDigit;
  }

  return false;
}

/**
 * Validate Turkish phone number format
 * Accepts formats like: +905551234567, 05551234567, +90 555 123 4567
 * @param phone The phone number to validate
 * @returns True if valid Turkish phone format
 */
export function isValidTurkishPhone(phone: string): boolean {
  if (typeof phone !== 'string') {
    return false;
  }

  const sanitized = phone.replace(/[\s\-().]/g, '');

  // Turkish phone: +90 or 0 followed by area code and number
  // Mobile: starts with 5 (after country code)
  // Landline: starts with 2-4 (after country code)

  // Format: +905XXXXXXXXX (with country code, 12 chars)
  if (/^\+905\d{9}$/.test(sanitized)) {
    return true;
  }

  // Format: +902XX or +903XX or +904XX (landline with country code)
  if (/^\+90[234]\d{9}$/.test(sanitized)) {
    return true;
  }

  // Format: 05XXXXXXXXX (without country code, mobile, 11 digits)
  if (/^05\d{9}$/.test(sanitized)) {
    return true;
  }

  // Format: 0[2-4]XX (without country code, landline)
  if (/^0[234]\d{9}$/.test(sanitized)) {
    return true;
  }

  return false;
}

/**
 * Mask sensitive data for safe logging
 * Useful for displaying partially censored information in logs
 * @param data The sensitive data to mask
 * @param visibleChars Number of characters to keep visible (default: 3)
 * @returns Masked string, e.g. "hos***@gmail.com"
 */
export function maskSensitiveData(data: string, visibleChars: number = 3): string {
  if (typeof data !== 'string' || data.length === 0) {
    return '***';
  }

  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }

  const visible = data.substring(0, visibleChars);
  const masked = '*'.repeat(Math.max(3, data.length - visibleChars));

  return `${visible}${masked}`;
}

/**
 * Sanitize object for safe logging
 * Masks sensitive fields like passwords, tokens, SSNs
 * @param obj The object to sanitize
 * @returns Object with sensitive fields masked
 */
export function sanitizeForLogging(
  obj: Record<string, unknown>
): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'accessToken',
    'refreshToken',
    'secret',
    'ssn',
    'creditCard',
    'bankAccount',
  ];

  const sanitized = { ...obj };

  for (const field of sensitiveFields) {
    if (field in sanitized && typeof sanitized[field] === 'string') {
      sanitized[field] = maskSensitiveData(sanitized[field] as string);
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize URL
 * Prevents javascript: and data: URI schemes
 * @param url The URL to validate
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file://')
  ) {
    return '';
  }

  // Allow relative URLs and safe absolute URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      // For absolute URLs, validate that the URL is well-formed
      if (trimmed.startsWith('http')) {
        new URL(url);
      }
      return url;
    } catch {
      return '';
    }
  }

  return '';
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 * @param filename The filename to sanitize
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'file';
  }

  return filename
    .replace(/\.\./g, '') // Remove directory traversal attempts
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove invalid filename characters
    .replace(/^\.+/, '') // Remove leading dots
    .trim() || 'file'; // Fallback to 'file' if empty
}

/**
 * Sanitize Turkish tax number (Vergi Kimlik Numarası)
 * Must be exactly 10 digits after cleaning
 * @param taxNumber The tax number to sanitize
 * @returns Sanitized 10-digit tax number or empty string if invalid
 */
export function sanitizeTaxNumber(taxNumber: string): string {
  if (typeof taxNumber !== 'string') {
    return '';
  }

  if (taxNumber.trim() === '') return '';

  // Remove whitespace and common separators
  const cleaned = taxNumber.trim().replace(/[\s\-().\/]/g, '');

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return '';
  }

  return cleaned;
}

/**
 * Mask email for display: shows first char, masks middle with ***, preserves domain
 * e.g., "selman@gmail.com" -> "s***n@gmail.com"
 * @param email The email to mask
 * @returns Masked email string
 */
export function maskEmail(email: string): string {
  if (typeof email !== 'string' || email === '') {
    return '';
  }

  const atIndex = email.indexOf('@');
  if (atIndex < 0) {
    return email;
  }

  const localPart = email.substring(0, atIndex);
  const domain = email.substring(atIndex); // includes @

  if (localPart.length <= 1) {
    return localPart + '***' + domain;
  }

  const first = localPart[0];
  const last = localPart[localPart.length - 1];
  return first + '***' + last + domain;
}

/**
 * Mask phone number for display in Turkish format
 * e.g., "905551234567" -> "+90 5** *** **67"
 * @param phone The phone number to mask
 * @returns Masked phone string
 */
export function maskPhone(phone: string): string {
  if (typeof phone !== 'string' || phone === '') {
    return '';
  }

  // Extract only digits
  let digits = phone.replace(/[^\d]/g, '');

  // Too short to mask meaningfully
  if (digits.length < 4) {
    return phone;
  }

  // Normalize to 10-digit core (without leading 0 or 90)
  let core = digits;
  if (core.startsWith('90') && core.length === 12) {
    core = core.slice(2); // remove country code -> 5551234567
  } else if (core.startsWith('0') && core.length === 11) {
    core = core.slice(1); // remove leading 0 -> 5551234567
  }

  if (core.length === 10) {
    const first = core[0]; // '5'
    const last2 = core.slice(-2);
    return `+90 ${first}** *** **${last2}`;
  }

  // Fallback: mask middle, show first and last 2
  const last2 = digits.slice(-2);
  return `+90 ${digits[0]}** *** **${last2}`;
}
