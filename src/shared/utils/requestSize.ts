/**
 * Request body size validation utility.
 * Protects against DoS attacks via oversized JSON payloads.
 */

const DEFAULT_MAX_SIZE_BYTES = 1_048_576; // 1MB

export class PayloadTooLargeError extends Error {
  constructor(contentLength: number, maxSize: number) {
    super(
      `Payload too large: ${Math.round(contentLength / 1024)}KB exceeds the ${Math.round(maxSize / 1024)}KB limit`
    );
    this.name = 'PayloadTooLargeError';
  }
}

/**
 * Parse a JSON request body with size enforcement.
 *
 * 1. Quick-rejects via Content-Length header when available.
 * 2. Reads the body as text, checks byte length, then parses JSON.
 * 3. Throws PayloadTooLargeError if the body exceeds maxSizeBytes.
 *
 * @param request  - The incoming Request object
 * @param maxSizeBytes - Maximum allowed body size in bytes (default 1 MB)
 * @returns The parsed JSON body typed as T
 */
export async function parseJsonBody<T>(
  request: Request,
  maxSizeBytes: number = DEFAULT_MAX_SIZE_BYTES
): Promise<T> {
  // Fast path: reject immediately if Content-Length header exceeds limit
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const declaredSize = parseInt(contentLength, 10);
    if (!isNaN(declaredSize) && declaredSize > maxSizeBytes) {
      throw new PayloadTooLargeError(declaredSize, maxSizeBytes);
    }
  }

  // Read body as text to measure actual byte size
  const bodyText = await request.text();
  const actualSize = new TextEncoder().encode(bodyText).byteLength;

  if (actualSize > maxSizeBytes) {
    throw new PayloadTooLargeError(actualSize, maxSizeBytes);
  }

  // Parse JSON from the text we already read
  return JSON.parse(bodyText) as T;
}
