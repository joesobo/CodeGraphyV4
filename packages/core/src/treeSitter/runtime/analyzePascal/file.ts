import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { normalizeAnalysisResult } from '../analyze/results';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';
import { addPascalCallRelations } from './calls';
import { addPascalInheritance } from './inheritance';
import { addPascalSymbols } from './symbols';
import { collectPascalImports } from './units';

export function analyzePascalTextFile(
  filePath: string,
  source: string,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const imports = collectPascalImports(relations, filePath, source, workspaceRoot);
  addPascalCallRelations(relations, filePath, source, imports.paths);
  addPascalInheritance(relations, filePath, source, workspaceRoot, imports.names);

  if (shouldIncludeTreeSitterSymbols(options)) {
    addPascalSymbols(symbols, filePath, source);
  }

  return normalizeAnalysisResult(filePath, symbols, relations);
}
