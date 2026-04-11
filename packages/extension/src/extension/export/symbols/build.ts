import type {
  IAnalysisNode,
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../core/plugins/types/contracts';
import type { WorkspaceAnalysisDatabaseSnapshot } from '../../pipeline/database/cache';

export interface SymbolExportFileEntry {
  filePath: string;
  nodeCount: number;
  symbolCount: number;
  relationCount: number;
}

export interface SymbolExportData {
  format: 'codegraphy-symbol-export';
  version: '1.0';
  exportedAt: string;
  summary: {
    totalFiles: number;
    totalNodes: number;
    totalSymbols: number;
    totalRelations: number;
  };
  files: SymbolExportFileEntry[];
  nodes: IAnalysisNode[];
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

function sortById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function sortByFilePath<T extends { filePath: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.filePath.localeCompare(right.filePath));
}

function countByFilePath<T extends { filePath: string }>(items: readonly T[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.filePath, (counts.get(item.filePath) ?? 0) + 1);
  }

  return counts;
}

function countRelationsByFromFilePath(
  items: readonly IAnalysisRelation[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.fromFilePath, (counts.get(item.fromFilePath) ?? 0) + 1);
  }

  return counts;
}

export function buildSymbolsExportData(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
): SymbolExportData {
  const files: SymbolExportFileEntry[] = [];
  const nodes: IAnalysisNode[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const relations: IAnalysisRelation[] = [];

  for (const [filePath, analysis] of [...fileAnalysis.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const fileNodes = analysis.nodes ?? [];
    const fileSymbols = analysis.symbols ?? [];
    const fileRelations = analysis.relations ?? [];

    files.push({
      filePath,
      nodeCount: fileNodes.length,
      symbolCount: fileSymbols.length,
      relationCount: fileRelations.length,
    });
    nodes.push(...fileNodes);
    symbols.push(...fileSymbols);
    relations.push(...fileRelations);
  }

  return {
    format: 'codegraphy-symbol-export',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    summary: {
      totalFiles: files.length,
      totalNodes: nodes.length,
      totalSymbols: symbols.length,
      totalRelations: relations.length,
    },
    files,
    nodes: sortById(nodes),
    symbols: sortByFilePath(symbols).map((symbol) => ({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      filePath: symbol.filePath,
      signature: symbol.signature,
      range: symbol.range,
      metadata: symbol.metadata,
    })),
    relations: [...relations].sort((left, right) => {
      const leftKey = `${left.fromFilePath}:${left.kind}:${left.toFilePath ?? ''}:${left.fromSymbolId ?? ''}:${left.toSymbolId ?? ''}`;
      const rightKey = `${right.fromFilePath}:${right.kind}:${right.toFilePath ?? ''}:${right.fromSymbolId ?? ''}:${right.toSymbolId ?? ''}`;
      return leftKey.localeCompare(rightKey);
    }),
  };
}

export function buildSymbolsExportDataFromSnapshot(
  snapshot: WorkspaceAnalysisDatabaseSnapshot,
): SymbolExportData {
  const symbolCountsByFile = countByFilePath(snapshot.symbols);
  const relationCountsByFile = countRelationsByFromFilePath(snapshot.relations);
  const nodes = sortById(snapshot.files.flatMap((file) => file.analysis.nodes ?? []));

  return {
    format: 'codegraphy-symbol-export',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    summary: {
      totalFiles: snapshot.files.length,
      totalNodes: nodes.length,
      totalSymbols: snapshot.symbols.length,
      totalRelations: snapshot.relations.length,
    },
    files: snapshot.files.map((file) => ({
      filePath: file.filePath,
      nodeCount: file.analysis.nodes?.length ?? 0,
      symbolCount: symbolCountsByFile.get(file.filePath) ?? 0,
      relationCount: relationCountsByFile.get(file.filePath) ?? 0,
    })),
    nodes,
    symbols: sortByFilePath(snapshot.symbols).map((symbol) => ({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      filePath: symbol.filePath,
      signature: symbol.signature,
      range: symbol.range,
      metadata: symbol.metadata,
    })),
    relations: [...snapshot.relations].sort((left, right) => {
      const leftKey = `${left.fromFilePath}:${left.kind}:${left.toFilePath ?? ''}:${left.fromSymbolId ?? ''}:${left.toSymbolId ?? ''}`;
      const rightKey = `${right.fromFilePath}:${right.kind}:${right.toFilePath ?? ''}:${right.fromSymbolId ?? ''}:${right.toSymbolId ?? ''}`;
      return leftKey.localeCompare(rightKey);
    }),
  };
}
