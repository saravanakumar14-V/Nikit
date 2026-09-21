import { RawFileInput } from './FileIngestionService';
import { SUPPORTED_EXTENSIONS } from './config';

export class FileSelectionService {
  /**
   * Primary file selection flow.
   * Attempts Tauri native open dialog where available, with seamless HTML5 fallback.
   */
  static async selectLocalFiles(): Promise<RawFileInput[]> {
    // 1. Attempt Tauri native dialog if available in environment
    try {
      // Check if Tauri dialog API is available dynamically
      const tauriDialog = (window as unknown as { __TAURI__?: { dialog?: { open: (opts: unknown) => Promise<string | string[] | null> } } })
        .__TAURI__?.dialog;

      if (tauriDialog && typeof tauriDialog.open === 'function') {
        const selected = await tauriDialog.open({
          multiple: true,
          filters: [
            {
              name: 'Supported Documents',
              extensions: [...SUPPORTED_EXTENSIONS],
            },
          ],
        });

        if (selected) {
          const paths = Array.isArray(selected) ? selected : [selected];
          // For Tauri path references, convert paths to RawFileInput
          return paths.map((p) => {
            const name = p.replace(/\\/g, '/').split('/').pop() || 'file';
            return {
              name,
              sourcePath: p,
              content: '', // Will be read via Tauri FS or fallback
            };
          });
        }
      }
    } catch {
      // Fall through to browser file picker
    }

    // 2. Browser file picker / HTML5 fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',');

      input.onchange = async () => {
        if (!input.files || input.files.length === 0) {
          resolve([]);
          return;
        }

        const files: RawFileInput[] = [];
        for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          const buffer = await file.arrayBuffer();
          files.push({
            name: file.name,
            content: buffer,
            sizeBytes: file.size,
            mimeType: file.type,
          });
        }
        resolve(files);
      };

      input.oncancel = () => {
        resolve([]);
      };

      input.click();
    });
  }

  /**
   * Helper to convert FileList from drag-and-drop into RawFileInput[].
   */
  static async fromFileList(fileList: FileList | File[]): Promise<RawFileInput[]> {
    const results: RawFileInput[] = [];
    const files = Array.from(fileList);

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      results.push({
        name: file.name,
        content: buffer,
        sizeBytes: file.size,
        mimeType: file.type,
      });
    }

    return results;
  }
}
