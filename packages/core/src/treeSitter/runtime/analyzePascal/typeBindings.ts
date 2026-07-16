import * as fs from 'node:fs';
import type { ImportedBinding } from '../analyze/model';

export function createPascalTypeUnitPathMap(
  importedUnitPaths: ReadonlyMap<string, string>,
): Map<string, ImportedBinding> {
  const typeUnitPaths = new Map<string, ImportedBinding>();
  for (const [unitName, resolvedPath] of importedUnitPaths) {
    typeUnitPaths.set(`T${unitName}`, createPascalBinding(unitName, resolvedPath));
    for (const typeName of readPascalDeclaredTypeNames(resolvedPath)) {
      typeUnitPaths.set(typeName, createPascalBinding(unitName, resolvedPath));
    }
  }
  return typeUnitPaths;
}

function createPascalBinding(unitName: string, resolvedPath: string): ImportedBinding {
  return { importedName: unitName, specifier: unitName, resolvedPath };
}

function readPascalDeclaredTypeNames(filePath: string): string[] {
  try {
    return [...fs.readFileSync(filePath, 'utf8').matchAll(/\b(T[A-Za-z_]\w*)\s*=/g)].map(match => match[1]);
  } catch {
    return [];
  }
}
