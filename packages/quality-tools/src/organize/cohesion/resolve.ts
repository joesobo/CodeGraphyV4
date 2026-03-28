/**
 * Resolve an import specifier to a filename in the same directory.
 *
 * Only resolves relative imports starting with './'.
 * Tries appending .ts, .tsx, .js, .jsx extensions.
 *
 * @param importSpecifier - The import string (e.g., './foo')
 * @param availableFiles - Map from base name (without extension) to actual filename
 * @returns The resolved filename, or undefined if not found
 */
export function resolveImportToFile(
  importSpecifier: string,
  availableFiles: Map<string, string>
): string | undefined {
  // Only process relative imports from the current directory
  if (!importSpecifier.startsWith('./')) {
    return undefined;
  }

  // Remove the './' prefix
  let relativePath = importSpecifier.slice(2);

  // Strip extension from the relative path if it has one
  // This allows './foo.ts' to resolve to the base name 'foo'
  const compoundExtensions = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];
  for (const ext of compoundExtensions) {
    if (relativePath.endsWith(ext)) {
      relativePath = relativePath.slice(0, -(ext.length));
      break;
    }
  }

  // Single extensions
  const singleExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of singleExtensions) {
    if (relativePath.endsWith(ext)) {
      relativePath = relativePath.slice(0, -(ext.length));
      break;
    }
  }

  // Now look up by base name (which is what we store in availableFiles)
  return availableFiles.get(relativePath);
}
