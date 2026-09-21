export interface DecodeResult {
  text: string;
  encoding: string;
  isLossless: boolean;
}

/**
 * Deterministic Encoding & Decoding Service.
 * Decodes raw byte buffers with explicit UTF-8 validation and controlled fallbacks.
 */
export class EncodingService {
  /**
   * Decodes an ArrayBuffer or text into a UTF-8 string with encoding detection.
   */
  static decode(data: ArrayBuffer | string): DecodeResult {
    if (typeof data === 'string') {
      return {
        text: data,
        encoding: 'UTF-8',
        isLossless: true,
      };
    }

    // 1. Attempt strict UTF-8 decoding
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      const decoded = utf8Decoder.decode(data);
      return {
        text: decoded,
        encoding: 'UTF-8',
        isLossless: true,
      };
    } catch {
      // 2. UTF-8 failed, attempt fallback (windows-1252 / latin1)
      try {
        const fallbackDecoder = new TextDecoder('windows-1252', { fatal: false });
        const decoded = fallbackDecoder.decode(data);
        return {
          text: decoded,
          encoding: 'Windows-1252 (Fallback)',
          isLossless: false,
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to decode file contents: ${errorMsg}`);
      }
    }
  }
}
