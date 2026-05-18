import type { ImportedBinding } from '../analyze/model';

export function addCollectedImportBinding(
  importedBindings: Map<string, ImportedBinding>,
  localName: string,
  importedName: string,
  specifier: string,
  resolvedPath: string | null,
  bindingKind: ImportedBinding['bindingKind'],
): ImportedBinding {
  const binding: ImportedBinding = {
    bindingKind,
    importedName,
    localName,
    resolvedPath,
    specifier,
  };
  importedBindings.set(localName, binding);
  return binding;
}
