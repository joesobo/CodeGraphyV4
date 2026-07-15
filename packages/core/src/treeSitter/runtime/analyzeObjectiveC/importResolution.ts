import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';

export function resolveObjectiveCImportPathForType(
  relations: readonly IAnalysisRelation[],
  typeName: string,
): string | null {
  return relations.find(relation => isObjectiveCImportForType(relation, typeName))?.resolvedPath ?? null;
}

function isObjectiveCImportForType(relation: IAnalysisRelation, typeName: string): boolean {
  return relation.kind === 'import'
    && Boolean(relation.resolvedPath)
    && relation.specifier?.split('/').pop()?.replace(/\.[hm]+$/, '') === typeName;
}
