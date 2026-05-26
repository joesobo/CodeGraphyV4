import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol } from '../analyze/results';
import { walkSymbolBody } from '../analyze/walk';
import {
  getJavaScriptDeclarationName,
  getJavaScriptTypeDeclarationKind,
} from './declarationNames';
export { handleJavaScriptVariableDeclarator } from './variableSymbols';

export function handleJavaScriptFunctionDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getJavaScriptDeclarationName(node);
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'function', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

export function handleJavaScriptClassDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getJavaScriptDeclarationName(node);
  if (name) {
    symbols.push(createSymbol(filePath, 'class', name, node));
  }
}

export function handleJavaScriptTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const name = getJavaScriptDeclarationName(node);
  if (!name) {
    return;
  }

  const kind = getJavaScriptTypeDeclarationKind(node);
  symbols.push(createSymbol(filePath, kind, name, node));
}

export function handleJavaScriptMethodDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getJavaScriptDeclarationName(node);
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}
