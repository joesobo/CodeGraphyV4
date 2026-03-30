/**
 * Remove the file extension from a filename.
 * Handles compound extensions like .test.ts.
 */
export function removeExtension(fileName: string): string {
  // Compound extensions first
  const compoundExtensions = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];
  for (const ext of compoundExtensions) {
    if (fileName.endsWith(ext)) {
      return fileName.slice(0, -(ext.length));
    }
  }

  // Single extensions
  const singleExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of singleExtensions) {
    if (fileName.endsWith(ext)) {
      return fileName.slice(0, -(ext.length));
    }
  }

  return fileName;
}
