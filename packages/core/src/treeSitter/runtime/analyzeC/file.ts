import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import CLanguage from 'tree-sitter-c';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import {
  addCFamilyCallRelation,
  readCFamilyCallDeclarations,
} from '../analyzeCFamily/calls';
import { handleCInclude } from '../analyzeCFamily/includes';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';
import { handleCSymbol } from './symbols';

function visitCNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'preproc_include') {
    handleCInclude(
      node,
      filePath,
      workspaceRoot,
      relations,
      symbolsEnabled ? symbols : undefined,
      'include',
    );
    return { skipChildren: true };
  }

  if (!symbolsEnabled) {
    return;
  }

  return handleCSymbol(node, filePath, symbols);
}

export function analyzeCFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node) =>
    visitCNode(node, filePath, workspaceRoot, relations, symbols, symbolsEnabled),
  );
  const declarations = readCFamilyCallDeclarations(
    tree.rootNode,
    filePath,
    relations,
    CLanguage as unknown as Parser.Language,
    symbolsEnabled,
  );
  walkTree(tree.rootNode, {}, (node) => {
    if (node.type === 'call_expression') {
      addCFamilyCallRelation(node, filePath, relations, declarations, symbolsEnabled);
    }
  });
  return normalizeAnalysisResult(filePath, symbols, relations);
}
