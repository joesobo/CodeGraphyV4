export function stripExtension(fileName: string): string {
  // Remove compound test extensions and regular extensions
  let baseName = fileName;

  // Strip compound test extensions first
  baseName = baseName.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '');

  // If no change was made, strip single extension
  if (baseName === fileName) {
    const lastDot = baseName.lastIndexOf('.');
    if (lastDot > 0) {
      baseName = baseName.slice(0, lastDot);
    }
  }

  return baseName;
}
