/**
 * Asynchronous Content Hashing Service
 * Calculates SHA-256 checksums without blocking the React main thread.
 * Ready for future offloading into Tauri Rust backend if needed.
 */
export class HashService {
  /**
   * Calculates SHA-256 hash of an ArrayBuffer or text string asynchronously.
   */
  static async calculateHash(data: ArrayBuffer | string): Promise<string> {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback simple checksum if WebCrypto is unavailable
    let hash = 0;
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      hash = (hash << 5) - hash + view[i];
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

export function hashText(text: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

