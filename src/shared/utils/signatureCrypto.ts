import crypto from 'crypto'

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET environment variable is required for signature encryption')
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypt signature data with AES-256-GCM
 * Returns format: enc:iv:authTag:ciphertext
 */
export function encryptSignature(data: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()
  return `enc:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt signature data. Supports both encrypted and legacy unencrypted formats.
 */
export function decryptSignature(encrypted: string): string | null {
  try {
    // Support unencrypted legacy signatures
    if (encrypted.startsWith('data:image/')) return encrypted

    if (!encrypted.startsWith('enc:')) return encrypted

    const parts = encrypted.split(':')
    if (parts.length !== 4) return null

    const [, ivB64, authTagB64, ciphertext] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(authTagB64, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return null
  }
}
