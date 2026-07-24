import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { readRelationSymbolName, resolveTargetSymbolId } from './targetSymbolName';

export interface ResolvedTargetSymbol {
  filePath: string;
  symbolId: string;
}

function readMetadataString(relation: IAnalysisRelation, key: string): string | undefined {
  const value = relation.metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isMetadataTrue(relation: IAnalysisRelation, key: string): boolean {
  return relation.metadata?.[key] === true;
}

function persistedReexportTargetName(
  reexport: IAnalysisRelation,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
): string | undefined {
  if (reexport.kind !== 'reexport' || !reexport.toFilePath || !reexport.toSymbolId) {
    return undefined;
  }
  return symbolsByFilePath
    .get(reexport.toFilePath)
    ?.find(symbol => symbol.id === reexport.toSymbolId)
    ?.name;
}

function forwardedReexportRelation(
  relation: IAnalysisRelation,
  reexport: IAnalysisRelation,
  symbolName: string,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
): IAnalysisRelation | undefined {
  if (!reexport.toFilePath) return undefined;
  const reexportAll = isMetadataTrue(reexport, 'reexportAll');
  const exportedName = readMetadataString(reexport, 'exportedName');
  const persistedTargetName = persistedReexportTargetName(reexport, symbolsByFilePath);
  const namedReexport = isMetadataTrue(reexport, 'reexport') && exportedName === symbolName;
  const persistedFileReexport = reexport.kind === 'reexport'
    && !reexport.toSymbolId
    && !isMetadataTrue(reexport, 'reexport');
  if (!reexportAll && !namedReexport && !persistedFileReexport
    && persistedTargetName !== symbolName) return undefined;
  const importedName = reexportAll || persistedFileReexport
    ? symbolName
    : readMetadataString(reexport, 'importedName') ?? persistedTargetName ?? symbolName;
  return {
    ...relation,
    toFilePath: reexport.toFilePath,
    resolvedPath: reexport.resolvedPath ?? reexport.toFilePath,
    metadata: {
      ...relation.metadata,
      importedName,
    },
  };
}

function followsReexportedTargets(relation: IAnalysisRelation): boolean {
  return ['call', 'event', 'inherit', 'reference'].includes(relation.kind);
}

export function resolveRelationTargetSymbols(
  relation: IAnalysisRelation,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
  relationsByFilePath: ReadonlyMap<string, readonly IAnalysisRelation[]>,
  visitedFiles: ReadonlySet<string> = new Set(),
): ResolvedTargetSymbol[] {
  if (!relation.toFilePath || visitedFiles.has(relation.toFilePath)) return [];
  const targetSymbols = symbolsByFilePath.get(relation.toFilePath) ?? [];
  const persistedTarget = relation.toSymbolId
    ? targetSymbols.find(symbol => symbol.id === relation.toSymbolId)
    : undefined;
  const directSymbolId = persistedTarget?.id ?? (targetSymbols.length > 0
    ? resolveTargetSymbolId(relation, targetSymbols)
    : undefined);
  const directSymbol = targetSymbols.find(symbol => symbol.id === directSymbolId);
  if (directSymbol && directSymbol.kind !== 'alias') {
    return [{ filePath: relation.toFilePath, symbolId: directSymbol.id }];
  }
  if (directSymbol) {
    const nextVisited = new Set([...visitedFiles, relation.toFilePath]);
    return (relationsByFilePath.get(relation.toFilePath) ?? [])
      .filter(aliasRelation => aliasRelation.fromSymbolId === directSymbol.id)
      .flatMap(aliasRelation => resolveRelationTargetSymbols(
        aliasRelation,
        symbolsByFilePath,
        relationsByFilePath,
        nextVisited,
      ));
  }
  if (!followsReexportedTargets(relation)) return [];

  const symbolName = readRelationSymbolName(relation);
  if (!symbolName) return [];
  const nextVisited = new Set([...visitedFiles, relation.toFilePath]);
  return (relationsByFilePath.get(relation.toFilePath) ?? []).flatMap((reexport) => {
    const forwarded = forwardedReexportRelation(
      relation,
      reexport,
      symbolName,
      symbolsByFilePath,
    );
    return forwarded
      ? resolveRelationTargetSymbols(
          forwarded,
          symbolsByFilePath,
          relationsByFilePath,
          nextVisited,
        )
      : [];
  });
}
