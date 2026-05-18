import iconv from 'iconv-lite';

/**
 * Detect text encoding of a buffer (UTF-8 vs Latin-1) and return UTF-8 string.
 *
 * Heuristic: try UTF-8 strict; if it produces replacement characters or
 * invalid sequences, fall back to Latin-1. Brazilian ERP exports (notably
 * Domínio) often write in ISO-8859-1.
 */
export function decodeBufferToUtf8(buf: ArrayBuffer | Uint8Array | Buffer): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf as ArrayBuffer);

  // Strip BOM if present.
  const start = u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf ? 3 : 0;
  const view = start ? u8.subarray(start) : u8;

  // Try UTF-8 strict via TextDecoder.
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(view);
  } catch {
    // Fall back to Latin-1 (windows-1252 is close enough for BR exports).
    return iconv.decode(Buffer.from(view), 'win1252');
  }
}
