import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { resolveTargetSymbolId } from './targetSymbolName';

export function enrichRelationTargetSymbol(
  relation: IAnalysisRelation,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
): IAnalysisRelation {
  if (relation.toSymbolId || !relation.toFilePath) {
    return relation;
  }

  const targetSymbols = symbolsByFilePath.get(relation.toFilePath);
  if (!targetSymbols?.length) {
    return relation;
  }

  const resolvedSymbolId = resolveTargetSymbolId(relation, targetSymbols);
  return resolvedSymbolId
    ? {
      ...relation,
      toSymbolId: resolvedSymbolId,
    }
    : relation;
}
