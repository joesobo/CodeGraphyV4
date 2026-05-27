import type { ImportedBinding } from '../analyze/model';
import { resolvePhpTypePath } from '../projectRoots/php';

export function resolvePhpReferencePath(
  sourceRoot: string | null,
  namespaceName: string | null,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  typeName: string,
): string | null {
  const importedBinding = importedBindings.get(typeName);
  if (importedBinding?.resolvedPath) {
    return importedBinding.resolvedPath;
  }

  if (typeName.includes('\\')) {
    return resolvePhpTypePath(sourceRoot, typeName);
  }

  return namespaceName
    ? resolvePhpTypePath(sourceRoot, `${namespaceName}\\${typeName}`)
    : null;
}
