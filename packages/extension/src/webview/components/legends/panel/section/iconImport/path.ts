export function sanitizeIconPathSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'icon';
}

export function getIconExtension(fileName: string): 'png' | 'svg' {
  const extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
  return extension === 'png' ? 'png' : 'svg';
}

export function getIconBaseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

export function buildLegendIconPath(legendId: string, fileName: string): string {
  const extension = getIconExtension(fileName);
  const baseName = getIconBaseName(fileName);
  return `.codegraphy/icons/${sanitizeIconPathSegment(legendId)}-${sanitizeIconPathSegment(baseName)}.${extension}`;
}
