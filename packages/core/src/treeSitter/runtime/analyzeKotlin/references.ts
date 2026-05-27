import type { ImportedBinding } from '../analyze/model';
import { resolveKotlinTypePath } from '../projectRoots/kotlin';

export function resolveKotlinReferencePath(
  sourceRoot: string | null,
  packageName: string | null,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  typeName: string,
): string | null {
  const importedBinding = importedBindings.get(typeName);
  if (importedBinding?.resolvedPath) {
    return importedBinding.resolvedPath;
  }

  if (typeName.includes('.')) {
    return resolveKotlinTypePath(sourceRoot, typeName);
  }

  return packageName
    ? resolveKotlinTypePath(sourceRoot, `${packageName}.${typeName}`)
    : null;
}
