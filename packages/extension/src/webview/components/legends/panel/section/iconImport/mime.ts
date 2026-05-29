import { getIconExtension } from './path';

export function getIconMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }

  return getIconExtension(file.name) === 'png' ? 'image/png' : 'image/svg+xml';
}
