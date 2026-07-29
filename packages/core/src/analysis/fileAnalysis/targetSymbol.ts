import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { resolveRelationTargetSymbols } from './reexportTarget';

export function enrichRelationTargetSymbol(
  relation: IAnalysisRelation,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
  relationsByFilePath: ReadonlyMap<string, readonly IAnalysisRelation[]> = new Map(),
): IAnalysisRelation {
  if (relation.toSymbolId || !relation.toFilePath) return relation;

  const targets = resolveRelationTargetSymbols(
    relation,
    symbolsByFilePath,
    relationsByFilePath,
  );
  const uniqueTargets = new Map(targets.map(target => [target.symbolId, target]));
  if (uniqueTargets.size !== 1) return relation;
  const target = [...uniqueTargets.values()][0];
  return {
    ...relation,
    toFilePath: target.filePath,
    resolvedPath: target.filePath,
    toSymbolId: target.symbolId,
  };
}
