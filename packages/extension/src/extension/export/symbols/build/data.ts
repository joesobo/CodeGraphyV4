import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '../../../../core/plugins/types/contracts';
import { createFileEntries, countByFilePath, countRelationsByFilePath } from './counts';
import { sortByFilePath } from './paths';
import { sortRelations } from './relations';
import type { SymbolExportData } from '../build';

export function normalizeSymbolFilePath(
  symbol: IAnalysisSymbol,
  resolveFilePath: (filePath: string) => string,
): IAnalysisSymbol {
  return {
    ...symbol,
    filePath: resolveFilePath(symbol.filePath),
  };
}

export function createExportSymbol(
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

export function createSymbolExportData(
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
