import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addCallRelation } from '../analyze/results';

export function addScalaCallRelations(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  callableBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  const receiverTypeNames = collectScalaReceiverTypeNames(source);
  const seen = new Set<string>();
  for (const match of source.matchAll(/\b([A-Z][A-Za-z_]\w*)\s*(?:\.|\()/g)) {
    addScalaCallRelationForBinding(relations, filePath, callableBindings.get(match[1]), seen);
  }
  for (const match of source.matchAll(/\b([a-z][A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\b/g)) {
    const typeName = receiverTypeNames.get(match[1]);
    if (typeName) addScalaCallRelationForBinding(relations, filePath, callableBindings.get(typeName), seen);
  }
}

function collectScalaReceiverTypeNames(source: string): Map<string, string> {
  const receiverTypeNames = new Map<string, string>();
  for (const match of source.matchAll(/\b(?:val|var)?\s*([a-z][A-Za-z_]\w*)\s*:\s*([A-Z][A-Za-z_]\w*)\b/g)) {
    receiverTypeNames.set(match[1], match[2]);
  }
  return receiverTypeNames;
}

function addScalaCallRelationForBinding(
  relations: IAnalysisRelation[],
  filePath: string,
  binding: ImportedBinding | undefined,
  seen: Set<string>,
): void {
  if (!binding?.resolvedPath || binding.resolvedPath === filePath || seen.has(binding.resolvedPath)) return;
  seen.add(binding.resolvedPath);
  addCallRelation(relations, filePath, binding);
}
