import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import {
  addFunctionSymbol,
  addNamedSymbol,
} from '../analyzeCFamily/emit';
import {
  findDescendantByType,
  getDeclarationNameNode,
  getFunctionNameNode,
  hasFunctionDeclarator,
} from '../analyzeCFamily/names';

const DECLARATOR_NODE_TYPES = new Set([
  'array_declarator',
  'attributed_declarator',
  'identifier',
  'init_declarator',
  'parenthesized_declarator',
  'pointer_declarator',
]);

const GLOBAL_DECLARATION_PARENT_TYPES = new Set([
  'preproc_elif',
  'preproc_elifdef',
  'preproc_else',
  'preproc_if',
  'preproc_ifdef',
  'translation_unit',
]);

const IDENTIFIER_NODE_TYPES = new Set([
  'field_identifier',
  'identifier',
  'type_identifier',
]);

export function handleCSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'declaration':
      return handleCDeclaration(node, filePath, symbols);
    case 'enum_specifier':
      addNamedSymbol(symbols, filePath, 'enum', getDeclarationNameNode(node), node);
      return { skipChildren: true };
    case 'function_definition':
      return addFunctionSymbol(node, filePath, symbols, 'function');
    case 'struct_specifier':
      addNamedSymbol(symbols, filePath, 'struct', getDeclarationNameNode(node), node);
      return;
    case 'type_definition':
      addCTypedefSymbol(node, filePath, symbols);
      return;
    case 'union_specifier':
      addNamedSymbol(symbols, filePath, 'union', getDeclarationNameNode(node), node);
      return;
    default:
      return;
  }
}

function handleCDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  if (hasFunctionDeclarator(node)) {
    addNamedSymbol(symbols, filePath, 'prototype', getFunctionNameNode(node), node);
    return { skipChildren: true };
  }

  if (!isTopLevelCDeclaration(node)) {
    return;
  }

  for (const nameNode of getTopLevelDeclaratorNameNodes(node)) {
    addNamedSymbol(symbols, filePath, 'global', nameNode, node);
  }

  return { skipChildren: true };
}

function addCTypedefSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const declarator = node.childForFieldName('declarator')
    ?? node.namedChildren.find((child) => child.type === 'type_identifier');
  addNamedSymbol(symbols, filePath, 'typedef', findDescendantByType(declarator, IDENTIFIER_NODE_TYPES), node);
}

function getTopLevelDeclaratorNameNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return node.namedChildren
    .filter((child) => DECLARATOR_NODE_TYPES.has(child.type))
    .map((child) => findDescendantByType(child, IDENTIFIER_NODE_TYPES))
    .filter((nameNode): nameNode is Parser.SyntaxNode => Boolean(nameNode?.text));
}

function isTopLevelCDeclaration(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (current.type === 'translation_unit') {
      return true;
    }

    if (!GLOBAL_DECLARATION_PARENT_TYPES.has(current.type)) {
      return false;
    }

    current = current.parent;
  }

  return false;
}
