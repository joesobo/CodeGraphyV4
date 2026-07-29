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

function isPersistedFileReexport(reexport: IAnalysisRelation): boolean {
  return reexport.kind === 'reexport'
    && !reexport.toSymbolId
    && !isMetadataTrue(reexport, 'reexport');
}

function reexportMatchesSymbol(
  reexport: IAnalysisRelation,
  symbolName: string,
  persistedTargetName: string | undefined,
): boolean {
  if (isMetadataTrue(reexport, 'reexportAll')) return true;
  if (isPersistedFileReexport(reexport)) return true;
  if (persistedTargetName === symbolName) return true;
  return isMetadataTrue(reexport, 'reexport')
    && readMetadataString(reexport, 'exportedName') === symbolName;
}

function forwardedImportedName(
  reexport: IAnalysisRelation,
  symbolName: string,
  persistedTargetName: string | undefined,
): string {
  const preserveSymbolName = isMetadataTrue(reexport, 'reexportAll')
    || isPersistedFileReexport(reexport);
  return preserveSymbolName
    ? symbolName
    : readMetadataString(reexport, 'importedName') ?? persistedTargetName ?? symbolName;
}

function forwardedReexportRelation(
  relation: IAnalysisRelation,
  reexport: IAnalysisRelation,
  symbolName: string,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
): IAnalysisRelation | undefined {
  if (!reexport.toFilePath) return undefined;
  const persistedTargetName = persistedReexportTargetName(reexport, symbolsByFilePath);
  if (!reexportMatchesSymbol(reexport, symbolName, persistedTargetName)) return undefined;
  const importedName = forwardedImportedName(reexport, symbolName, persistedTargetName);
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

function directTargetSymbol(
  relation: IAnalysisRelation,
  targetSymbols: readonly IAnalysisSymbol[],
): IAnalysisSymbol | undefined {
  const persistedTarget = relation.toSymbolId
    ? targetSymbols.find(symbol => symbol.id === relation.toSymbolId)
    : undefined;
  const symbolId = persistedTarget?.id ?? (targetSymbols.length > 0
    ? resolveTargetSymbolId(relation, targetSymbols)
    : undefined);
  return targetSymbols.find(symbol => symbol.id === symbolId);
}

function nextVisitedFiles(
  visitedFiles: ReadonlySet<string>,
  filePath: string,
): ReadonlySet<string> {
  return new Set([...visitedFiles, filePath]);
}

function resolveAliasTargetSymbols(
  directSymbol: IAnalysisSymbol,
  filePath: string,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
  relationsByFilePath: ReadonlyMap<string, readonly IAnalysisRelation[]>,
  visitedFiles: ReadonlySet<string>,
): ResolvedTargetSymbol[] {
  const nextVisited = nextVisitedFiles(visitedFiles, filePath);
  return (relationsByFilePath.get(filePath) ?? [])
    .filter(aliasRelation => aliasRelation.fromSymbolId === directSymbol.id)
    .flatMap(aliasRelation => resolveRelationTargetSymbols(
      aliasRelation,
      symbolsByFilePath,
      relationsByFilePath,
      nextVisited,
    ));
}

function resolveReexportTargetSymbols(
  relation: IAnalysisRelation,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
  relationsByFilePath: ReadonlyMap<string, readonly IAnalysisRelation[]>,
  visitedFiles: ReadonlySet<string>,
): ResolvedTargetSymbol[] {
  if (!relation.toFilePath || !followsReexportedTargets(relation)) return [];
  const symbolName = readRelationSymbolName(relation);
  if (!symbolName) return [];
  const nextVisited = nextVisitedFiles(visitedFiles, relation.toFilePath);
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

export function resolveRelationTargetSymbols(
  relation: IAnalysisRelation,
  symbolsByFilePath: ReadonlyMap<string, IAnalysisSymbol[]>,
  relationsByFilePath: ReadonlyMap<string, readonly IAnalysisRelation[]>,
  visitedFiles: ReadonlySet<string> = new Set(),
): ResolvedTargetSymbol[] {
  if (!relation.toFilePath || visitedFiles.has(relation.toFilePath)) return [];
  const targetSymbols = symbolsByFilePath.get(relation.toFilePath) ?? [];
  const directSymbol = directTargetSymbol(relation, targetSymbols);
  if (directSymbol && directSymbol.kind !== 'alias') {
    return [{ filePath: relation.toFilePath, symbolId: directSymbol.id }];
  }
  if (directSymbol) {
    return resolveAliasTargetSymbols(
      directSymbol,
      relation.toFilePath,
      symbolsByFilePath,
      relationsByFilePath,
      visitedFiles,
    );
  }
  return resolveReexportTargetSymbols(
    relation,
    symbolsByFilePath,
    relationsByFilePath,
    visitedFiles,
  );
}
