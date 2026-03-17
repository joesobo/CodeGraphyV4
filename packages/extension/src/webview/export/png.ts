import { postMessage } from '../vscodeApi';
import { createExportTimestamp, createImageExportDataUrl } from './exportContext';

export function exportAsPng(container: HTMLDivElement | null): void {
  try {
    const dataUrl = createImageExportDataUrl(container, { mimeType: 'image/png' });
    if (!dataUrl) {
      console.error('[CodeGraphy] No canvas found');
      return;
    }

    const timestamp = createExportTimestamp();
    postMessage({
      type: 'EXPORT_PNG',
      payload: { dataUrl, filename: `codegraphy-${timestamp}.png` },
    });
  } catch (error) {
    console.error('[CodeGraphy] Export failed:', error);
  }
}
