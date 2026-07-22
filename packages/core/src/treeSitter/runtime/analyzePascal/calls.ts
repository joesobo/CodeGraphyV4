import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addCallRelation } from '../analyze/results';
import { createPascalTypeUnitPathMap } from './typeBindings';

export function addPascalCallRelations(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  importedUnitPaths: ReadonlyMap<string, string>,
): void {
  const typeUnitPaths = createPascalTypeUnitPathMap(importedUnitPaths);
  const receiverTypeNames = collectPascalReceiverTypeNames(source);
  const seen = new Set<string>();
  for (const match of source.matchAll(/\b(T[A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\b/g)) {
    addPascalCallRelationForType(relations, filePath, match[1], typeUnitPaths, seen);
  }
  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\b/g)) {
    const receiverTypeName = receiverTypeNames.get(match[1]);
    if (receiverTypeName) addPascalCallRelationForType(relations, filePath, receiverTypeName, typeUnitPaths, seen);
  }
}

function collectPascalReceiverTypeNames(source: string): Map<string, string> {
  const receiverTypeNames = new Map<string, string>();
  for (const match of source.matchAll(/^\s*([A-Za-z_]\w*)\s*:\s*(T[A-Za-z_]\w*)\s*;/gm)) {
    receiverTypeNames.set(match[1], match[2]);
  }
  return receiverTypeNames;
}

function addPascalCallRelationForType(
  relations: IAnalysisRelation[],
  filePath: string,
  typeName: string,
  typeUnitPaths: ReadonlyMap<string, ImportedBinding>,
  seen: Set<string>,
): void {
  const binding = typeUnitPaths.get(typeName);
  if (!binding?.resolvedPath || seen.has(binding.resolvedPath)) return;
  seen.add(binding.resolvedPath);
  addCallRelation(relations, filePath, binding);
}
