import { postMessage } from '../vscodeApi';
import { createExportTimestamp, createImageExportDataUrl } from './shared/context';

export function exportAsJpeg(container: HTMLDivElement | null): void {
  try {
    const dataUrl = createImageExportDataUrl(container, { mimeType: 'image/jpeg', quality: 0.92 });
    if (!dataUrl) {
      console.error('[CodeGraphy] No canvas found');
      return;
    }

    const timestamp = createExportTimestamp();
    postMessage({
      type: 'EXPORT_JPEG',
      payload: { dataUrl, filename: `codegraphy-${timestamp}.jpg` },
    });
  } catch (error) {
    console.error('[CodeGraphy] JPEG export failed:', error);
  }
}
