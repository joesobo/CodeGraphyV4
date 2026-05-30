import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleLuaFunctionCall } from './imports';
import {
  handleLuaFunctionDeclaration,
  handleLuaVariableDeclaration,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitLuaNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'function_call' && handleLuaFunctionCall(node, filePath, workspaceRoot, relations)) {
    return { skipChildren: true };
  }

  if (node.type === 'variable_declaration') {
    if (!symbolsEnabled) {
      return;
    }
    handleLuaVariableDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'function_declaration') {
    return symbolsEnabled
      ? handleLuaFunctionDeclaration(node, filePath, symbols)
      : undefined;
  }

  return;
}

export function analyzeLuaFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node) =>
    visitLuaNode(node, filePath, workspaceRoot, relations, symbols, symbolsEnabled),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
