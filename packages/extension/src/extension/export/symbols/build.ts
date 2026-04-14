import type {
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../core/plugins/types/contracts';
import type { WorkspaceAnalysisDatabaseSnapshot } from '../../pipeline/database/cache';

export interface SymbolExportFileEntry {
  filePath: string;
  symbolCount: number;
  relationCount: number;
}

export interface SymbolExportData {
  format: 'codegraphy-symbol-export';
  version: '1.0';
  exportedAt: string;
  summary: {
    totalFiles: number;
    totalSymbols: number;
    totalRelations: number;
  };
  files: SymbolExportFileEntry[];
  symbols: Array<{
    id: string;
    name: string;
    kind: string;
    filePath: string;
    signature?: string;
    range?: IAnalysisRange;
    metadata?: Record<string, string | number | boolean | null>;
  }>;
  relations: IAnalysisRelation[];
}

function sortByFilePath<T extends { filePath: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.filePath.localeCompare(right.filePath));
}

function normalizePathSlashes(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function createExportFilePathResolver(filePaths: readonly string[]): (filePath: string) => string {
  const normalizedByExportPath = new Map<string, string>();

  for (const filePath of filePaths) {
    normalizedByExportPath.set(normalizePathSlashes(filePath), filePath);
  }

  return (filePath: string): string => {
    const normalized = normalizePathSlashes(filePath);
    const exactMatch = normalizedByExportPath.get(normalized);

    if (exactMatch) {
      return exactMatch;
    }

    for (const [candidate, exportPath] of normalizedByExportPath.entries()) {
      if (normalized.endsWith(`/${candidate}`)) {
        return exportPath;
      }
    }

    return normalized;
  };
}

function countByFilePath<T extends { filePath: string }>(items: readonly T[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.filePath, (counts.get(item.filePath) ?? 0) + 1);
  }

  return counts;
}

function countRelationsByFilePath(
  items: readonly IAnalysisRelation[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.fromFilePath, (counts.get(item.fromFilePath) ?? 0) + 1);
    if (item.toFilePath && item.toFilePath !== item.fromFilePath) {
      counts.set(item.toFilePath, (counts.get(item.toFilePath) ?? 0) + 1);
    }
  }

  return counts;
}

function normalizeSymbolFilePath(
  symbol: IAnalysisSymbol,
  resolveFilePath: (filePath: string) => string,
): IAnalysisSymbol {
  return {
    ...symbol,
    filePath: resolveFilePath(symbol.filePath),
  };
}

function createFileEntries(
  filePaths: readonly string[],
  symbolCountsByFile: ReadonlyMap<string, number>,
  relationCountsByFile: ReadonlyMap<string, number>,
): SymbolExportFileEntry[] {
  return filePaths.map((filePath) => ({
    filePath,
    symbolCount: symbolCountsByFile.get(filePath) ?? 0,
    relationCount: relationCountsByFile.get(filePath) ?? 0,
  }));
}

function createExportSymbol(
  symbol: IAnalysisSymbol,
): SymbolExportData['symbols'][number] {
  return {
    id: symbol.id,
    name: symbol.name,
    kind: symbol.kind,
    filePath: symbol.filePath,
    signature: symbol.signature,
    range: symbol.range,
    metadata: symbol.metadata,
  };
}

function relationSortKey(relation: IAnalysisRelation): string {
  return `${relation.fromFilePath}:${relation.kind}:${relation.toFilePath ?? ''}:${relation.fromSymbolId ?? ''}:${relation.toSymbolId ?? ''}`;
}

function sortRelations(relations: readonly IAnalysisRelation[]): IAnalysisRelation[] {
  return [...relations].sort((left, right) => relationSortKey(left).localeCompare(relationSortKey(right)));
}

function createSymbolExportData(
  filePaths: readonly string[],
  symbols: readonly IAnalysisSymbol[],
  relations: readonly IAnalysisRelation[],
): SymbolExportData {
  const symbolCountsByFile = countByFilePath(symbols);
  const relationCountsByFile = countRelationsByFilePath(relations);
  const files = createFileEntries(filePaths, symbolCountsByFile, relationCountsByFile);

  return {
    format: 'codegraphy-symbol-export',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    summary: {
      totalFiles: files.length,
      totalSymbols: symbols.length,
      totalRelations: relations.length,
    },
    files,
    symbols: sortByFilePath(symbols).map(createExportSymbol),
    relations: sortRelations(relations),
  };
}

function normalizeRelationFilePaths(
  relation: IAnalysisRelation,
  resolveFilePath: (filePath: string) => string,
): IAnalysisRelation {
  return {
    ...relation,
    fromFilePath: resolveFilePath(relation.fromFilePath),
    toFilePath: relation.toFilePath ? resolveFilePath(relation.toFilePath) : undefined,
  };
}

export function buildSymbolsExportData(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): SymbolExportData {
  const filePaths: string[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const relations: IAnalysisRelation[] = [];

  for (const [filePath, analysis] of [...fileAnalysis.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    filePaths.push(filePath);
    symbols.push(...(analysis.symbols ?? []));
    relations.push(...(analysis.relations ?? []));
  }

  const resolveFilePath = createExportFilePathResolver(filePaths);
  const normalizedSymbols = symbols.map((symbol) => normalizeSymbolFilePath(symbol, resolveFilePath));
  const normalizedRelations = relations.map((relation) => normalizeRelationFilePaths(relation, resolveFilePath));

  return createSymbolExportData(filePaths, normalizedSymbols, normalizedRelations);
}

export function buildSymbolsExportDataFromSnapshot(
  snapshot: WorkspaceAnalysisDatabaseSnapshot,
): SymbolExportData {
  const filePaths = snapshot.files.map((file) => file.filePath);
  const resolveFilePath = createExportFilePathResolver(filePaths);
  const symbols = snapshot.symbols.map((symbol) => normalizeSymbolFilePath(symbol, resolveFilePath));
  const relations = snapshot.relations.map((relation) => normalizeRelationFilePaths(relation, resolveFilePath));

  return createSymbolExportData(filePaths, symbols, relations);
}
