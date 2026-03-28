/**
 * Strip known file extensions from a name.
 *
 * Handles compound extensions (.test.ts, .spec.tsx, etc.) before single extensions.
 */
export function stripExtension(name: string): string {
  // Compound extensions first (must be checked before single extensions)
  const compoundExtensions = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];
  for (const ext of compoundExtensions) {
    if (name.endsWith(ext)) {
      return name.slice(0, -(ext.length));
    }
  }

  // Single extensions
  const singleExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of singleExtensions) {
    if (name.endsWith(ext)) {
      return name.slice(0, -(ext.length));
    }
  }

  return name;
}
