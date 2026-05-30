import type {
  IAnalysisRelationshipEvidence,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import {
  materializeRelationshipTargetPath,
} from '../relationshipEvidence';
import { resolveTargetSymbolId } from './targetSymbolName';

export function enrichRelationTargetSymbol(
  relation: IAnalysisRelationshipEvidence,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
  workspaceRoot: string,
): IAnalysisRelationshipEvidence {
  if (relation.target.kind === 'symbol') {
    return relation;
  }

  const targetPath = materializeRelationshipTargetPath(relation.target, workspaceRoot);
  if (!targetPath) {
    return relation;
  }

  const targetSymbols = symbolsByFilePath.get(targetPath);
  if (!targetSymbols?.length) {
    return relation;
  }

  const resolvedSymbolId = resolveTargetSymbolId(relation, targetSymbols);
  return resolvedSymbolId
    ? {
      ...relation,
      target: {
        kind: 'symbol',
        symbolId: resolvedSymbolId,
        filePath: targetPath,
        specifier: relation.target.specifier,
      },
    }
    : relation;
}
