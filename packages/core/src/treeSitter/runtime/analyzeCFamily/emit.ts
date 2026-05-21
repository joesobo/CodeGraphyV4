import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol } from '../analyze/results';
import {
  findDescendantByType,
  getDeclarationNameNode,
  getFunctionNameNode,
} from './names';

const TYPE_IDENTIFIER_NODE_TYPES = new Set(['field_identifier', 'identifier', 'type_identifier']);

export function addNamedSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  nameNode: Parser.SyntaxNode | null,
  rangeNode: Parser.SyntaxNode,
): void {
  if (!nameNode?.text) {
    return;
  }

  symbols.push(createSymbol(filePath, kind, nameNode.text, rangeNode));
}

export function addFunctionSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  kind: 'function' | 'method',
): TreeWalkAction<SymbolWalkState> {
  addNamedSymbol(symbols, filePath, kind, getFunctionNameNode(node), node);
  return { skipChildren: true };
}

export function addCxxTypeSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const kind = node.type === 'class_specifier'
    ? 'class'
    : node.type === 'union_specifier'
      ? 'union'
      : 'struct';

  addNamedSymbol(symbols, filePath, kind, getDeclarationNameNode(node), node);
}

export function addTypeAliasSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const declarator = node.childForFieldName('declarator')
    ?? node.namedChildren.find((child) => child.type === 'type_identifier');
  addNamedSymbol(symbols, filePath, 'type', findDescendantByType(declarator, TYPE_IDENTIFIER_NODE_TYPES), node);
}
