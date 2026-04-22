import type { LegendIconImport } from '../../../../../shared/protocol/webviewToExtension';

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'icon';
}

function getIconExtension(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'png' ? 'png' : 'svg';
}

function getIconMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }

  return getIconExtension(file) === 'png' ? 'image/png' : 'image/svg+xml';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read icon file.'));
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read icon file.')));
    reader.readAsArrayBuffer(file);
  });
}

export async function createLegendIconImport(
  legendId: string,
  file: File,
): Promise<{ imageUrl: string; importPayload: LegendIconImport }> {
  const extension = getIconExtension(file);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const imagePath = `.codegraphy/icons/${sanitizeSegment(legendId)}-${sanitizeSegment(baseName)}.${extension}`;
  const contentsBase64 = arrayBufferToBase64(await readFileAsArrayBuffer(file));

  return {
    imageUrl: `data:${getIconMimeType(file)};base64,${contentsBase64}`,
    importPayload: {
      imagePath,
      contentsBase64,
    },
  };
}
