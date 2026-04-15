import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '../../../../../../core/plugins/types/contracts';
import { getVariableAssignedFunctionSymbol } from './imports';
import type { SymbolWalkState, TreeWalkAction } from './model';
import { getIdentifierText } from './nodes';
import { createSymbol } from './results';
import { walkSymbolBody } from './walk';

export function handleJavaScriptFunctionDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
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
  const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
  if (name) {
    symbols.push(createSymbol(filePath, 'class', name, node));
  }
}

export function handleJavaScriptMethodDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

export function handleJavaScriptVariableDeclarator(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const symbol = getVariableAssignedFunctionSymbol(node, filePath);
  if (!symbol) {
    return;
  }

  symbols.push(symbol);
  const valueNode = node.childForFieldName('value') ?? node.namedChildren.at(-1);
  const body = valueNode?.childForFieldName('body') ?? valueNode?.namedChildren.at(-1);
  if (body) {
    walk(body, { currentSymbolId: symbol.id });
  }

  return { skipChildren: true };
}
