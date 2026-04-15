import type { ImportedBinding } from './model';

export function addCollectedImportBinding(
  importedBindings: Map<string, ImportedBinding>,
  localName: string,
  importedName: string,
  specifier: string,
  resolvedPath: string | null,
): void {
  importedBindings.set(localName, {
    importedName,
    resolvedPath,
    specifier,
  });
}
