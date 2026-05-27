export function normalizePluginExtension(extension: string): string {
  return (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase();
}

export function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filePath.length - 1) {
    return '';
  }
  return filePath.slice(lastDot).toLowerCase();
}
