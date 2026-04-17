import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../core/plugins/types/contracts';
import type { WorkspaceAnalysisDatabaseSnapshot } from '../../pipeline/database/cache/storage';
import {
  createSymbolExportData,
  normalizeSymbolFilePath,
} from './build/data';
import { createExportFilePathResolver } from './build/paths';
import { normalizeRelationFilePaths } from './build/relations';

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
    range?: IAnalysisSymbol['range'];
    metadata?: Record<string, string | number | boolean | null>;
  }>;
  relations: IAnalysisRelation[];
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
