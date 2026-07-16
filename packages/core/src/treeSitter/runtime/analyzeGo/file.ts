import type Parser from 'tree-sitter';
import type { IAnalysisRelation, IAnalysisSymbol, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { shouldIncludeTreeSitterSymbols, type TreeSitterAnalysisOptions } from '../options';
import { visitGoNode } from './visitor';

export function analyzeGoFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const receiverBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node, state, walk) => visitGoNode(node, state, {
    walk,
    filePath,
    workspaceRoot,
    relations,
    symbols,
    importedBindings,
    receiverBindings,
    symbolsEnabled,
  }));
  return normalizeAnalysisResult(filePath, symbols, relations);
}
