import { DEFAULT_DIRECTION_COLOR } from '../../../shared/fileColors';

const EXPORT_BACKGROUND_COLOR = '#18181b';

interface CanvasExportOptions {
  mimeType: 'image/png' | 'image/jpeg';
  quality?: number;
}

export function createExportTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function resolveDirectionColor(directionColor: string): string {
  return /^#[0-9A-F]{6}$/i.test(directionColor) ? directionColor : DEFAULT_DIRECTION_COLOR;
}

export function createImageExportDataUrl(
  container: HTMLDivElement | null,
  options: CanvasExportOptions
): string | null {
  const canvases = container?.querySelectorAll('canvas');
  const firstCanvas = canvases?.[0];
  if (!firstCanvas || !canvases) {
    return null;
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = firstCanvas.width;
  exportCanvas.height = firstCanvas.height;

  const context = exportCanvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.fillStyle = EXPORT_BACKGROUND_COLOR;
  context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  canvases.forEach(canvas => context.drawImage(canvas, 0, 0));

  if (options.quality === undefined) {
    return exportCanvas.toDataURL(options.mimeType);
  }

  return exportCanvas.toDataURL(options.mimeType, options.quality);
}
