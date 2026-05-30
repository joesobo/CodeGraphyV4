import type Parser from 'tree-sitter';
import type {
  IAnalysisRelationshipEvidence,
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

function visitLuaNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelationshipEvidence[],
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'function_call' && handleLuaFunctionCall(node, filePath, workspaceRoot, relations)) {
    return { skipChildren: true };
  }

  if (node.type === 'variable_declaration') {
    handleLuaVariableDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'function_declaration') {
    return handleLuaFunctionDeclaration(node, filePath, symbols);
  }

  return;
}

export function analyzeLuaFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const relations: IAnalysisRelationshipEvidence[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node) =>
    visitLuaNode(node, filePath, workspaceRoot, relations, symbols),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
