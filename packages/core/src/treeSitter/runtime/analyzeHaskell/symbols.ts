import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol } from '../analyze/results';

function addNamedSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  name: string | null | undefined,
  node: Parser.SyntaxNode,
): void {
  if (name) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }
}

export function handleHaskellHeader(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addNamedSymbol(symbols, filePath, 'module', node.childForFieldName('module')?.text, node);
}

function addSkippingDeclarationSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  kind: string,
): TreeWalkAction<SymbolWalkState> {
  addNamedSymbol(symbols, filePath, kind, node.childForFieldName('name')?.text, node);
  return { skipChildren: true };
}

function addClassDeclarationSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addNamedSymbol(symbols, filePath, 'class', node.childForFieldName('name')?.text, node);
}

export function handleHaskellDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'data_type':
      return addSkippingDeclarationSymbol(node, filePath, symbols, 'data');
    case 'newtype':
      return addSkippingDeclarationSymbol(node, filePath, symbols, 'newtype');
    case 'type_synonym':
      return addSkippingDeclarationSymbol(node, filePath, symbols, 'type');
    case 'class':
      addClassDeclarationSymbol(node, filePath, symbols);
      return;
    case 'function':
      return addSkippingDeclarationSymbol(node, filePath, symbols, 'function');
    default:
      return;
  }
}
