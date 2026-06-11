import Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleCInclude } from '../analyzeCFamily/includes';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';
import { addCppSemanticRelations } from './semanticRelations';
import { handleCppSymbol, type CppSymbolWalkState } from './symbols';

function visitCppNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (node.type === 'preproc_include') {
    handleCInclude(node, filePath, workspaceRoot, relations, 'include');
    return;
  }

  if (!symbolsEnabled) {
    return;
  }

  return handleCppSymbol(node, filePath, symbols, state);
}

export function analyzeCppFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree<CppSymbolWalkState>(tree.rootNode, {}, (node, state) =>
    visitCppNode(node, filePath, workspaceRoot, relations, symbols, symbolsEnabled, state),
  );
  addCppSemanticRelations(tree.rootNode, filePath, workspaceRoot, relations, symbolsEnabled);
  return normalizeAnalysisResult(filePath, symbols, relations);
}
