import type Parser from 'tree-sitter';
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
import { addObjectiveCInheritance } from './inheritance';
import { addObjectiveCImports } from './imports';
import { addObjectiveCMessageCallRelations } from './messageCalls';
import { addObjectiveCSymbols } from './symbols';

export function analyzeObjectiveCFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const source = tree.rootNode.text;
  const importedTypePaths = addObjectiveCImports(relations, filePath, source, workspaceRoot);
  addObjectiveCMessageCallRelations(relations, filePath, tree.rootNode, importedTypePaths);
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  addObjectiveCInheritance(relations, filePath, source, symbolsEnabled);
  if (symbolsEnabled) addObjectiveCSymbols(symbols, filePath, source, tree.rootNode);

  return normalizeAnalysisResult(filePath, symbols, relations);
}
