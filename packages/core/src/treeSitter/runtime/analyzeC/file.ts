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
  readCFamilyIncludedCallDeclarations,
} from '../analyzeCFamily/calls';
import { handleCInclude } from '../analyzeCFamily/includes';
import { handleCFamilySymbol } from '../analyzeCFamily/symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitCNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'preproc_include') {
    handleCInclude(node, filePath, workspaceRoot, relations);
    return { skipChildren: true };
  }

  if (!symbolsEnabled) {
    return;
  }

  return handleCFamilySymbol(node, filePath, symbols);
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
  const includedDeclarations = readCFamilyIncludedCallDeclarations(
    relations,
    CLanguage as unknown as Parser.Language,
  );
  walkTree(tree.rootNode, {}, (node) => {
    if (node.type === 'call_expression') {
      addCFamilyCallRelation(node, filePath, relations, includedDeclarations, symbolsEnabled);
    }
  });
  return normalizeAnalysisResult(filePath, symbols, relations);
}
