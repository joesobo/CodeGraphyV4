import type Parser from 'tree-sitter';
import type { IAnalysisRelation, IAnalysisSymbol, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { shouldIncludeTreeSitterSymbols, type TreeSitterAnalysisOptions } from '../options';
import { visitDartNode } from './visitor';

export function analyzeDartFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const importedSymbolPaths = new Map<string, string | null>();
  const importedSymbolKinds = new Map<string, string>();
  const localValueReturningMethods = new Set<string>();
  const pendingSymbolContext = { value: undefined as { id?: string; kind: string } | undefined };
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node, state) => visitDartNode(node, state, {
    filePath,
    workspaceRoot,
    relations,
    symbols,
    importedSymbolPaths,
    importedSymbolKinds,
    localValueReturningMethods,
    pendingSymbolContext,
    symbolsEnabled,
  }));
  return normalizeAnalysisResult(filePath, symbols, relations);
}
