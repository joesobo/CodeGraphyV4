import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';

function readRelationSignatures(relations: readonly IAnalysisRelation[]): string {
  return relations
    .map(relation => [
      relation.kind,
      relation.fromSymbolId ?? '',
      relation.toFilePath ?? '',
      relation.specifier,
    ].join('\0'))
    .sort()
    .join('\n');
}

export function readChangedRelationSourceFiles(
  previous: ReadonlyMap<string, readonly IAnalysisRelation[]>,
  next: ReadonlyMap<string, readonly IAnalysisRelation[]>,
): string[] {
  const sourceFiles = new Set([...previous.keys(), ...next.keys()]);
  return [...sourceFiles].filter(sourceFile => (
    readRelationSignatures(previous.get(sourceFile) ?? [])
      !== readRelationSignatures(next.get(sourceFile) ?? [])
  ));
}
