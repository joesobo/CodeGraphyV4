import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '../../../../../../core/plugins/types/contracts';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol } from '../analyze/results';

const IDENTIFIER_NODE_TYPES = new Set([
  'field_identifier',
  'identifier',
  'namespace_identifier',
  'type_identifier',
]);

function findDescendantByType(
  node: Parser.SyntaxNode | null | undefined,
  types: ReadonlySet<string>,
): Parser.SyntaxNode | null {
  if (!node) {
    return null;
  }

  if (types.has(node.type)) {
    return node;
  }

  for (const child of node.namedChildren) {
    const match = findDescendantByType(child, types);
    if (match) {
      return match;
    }
  }

  return null;
}

function getDeclarationNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  return node.childForFieldName('name') ?? findDescendantByType(node, IDENTIFIER_NODE_TYPES);
}

function getFunctionNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const declarator = node.childForFieldName('declarator')
    ?? node.namedChildren.find((child) => child.type === 'function_declarator');

  return findDescendantByType(declarator, IDENTIFIER_NODE_TYPES);
}

function isInsideClassLike(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (
      current.type === 'class_specifier'
      || current.type === 'struct_specifier'
      || current.type === 'union_specifier'
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function addNamedSymbol(
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

function addFunctionSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  kind: 'function' | 'method',
): TreeWalkAction<SymbolWalkState> {
  addNamedSymbol(symbols, filePath, kind, getFunctionNameNode(node), node);
  return { skipChildren: true };
}

function addCxxTypeSymbol(
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

function addTypeAliasSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const declarator = node.childForFieldName('declarator')
    ?? node.namedChildren.find((child) => child.type === 'type_identifier');
  addNamedSymbol(symbols, filePath, 'type', findDescendantByType(declarator, IDENTIFIER_NODE_TYPES), node);
}

export function handleCFamilySymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'function_definition': {
      const kind = isInsideClassLike(node) ? 'method' : 'function';
      return addFunctionSymbol(node, filePath, symbols, kind);
    }
    case 'declaration': {
      if (node.namedChildren.some((child) => child.type === 'function_declarator')) {
        return addFunctionSymbol(node, filePath, symbols, 'function');
      }

      return;
    }
    case 'field_declaration': {
      if (node.namedChildren.some((child) => child.type === 'function_declarator')) {
        return addFunctionSymbol(node, filePath, symbols, 'method');
      }

      return;
    }
    case 'struct_specifier':
    case 'union_specifier':
    case 'class_specifier': {
      addCxxTypeSymbol(node, filePath, symbols);
      return;
    }
    case 'enum_specifier': {
      addNamedSymbol(symbols, filePath, 'enum', getDeclarationNameNode(node), node);
      return { skipChildren: true };
    }
    case 'namespace_definition': {
      addNamedSymbol(symbols, filePath, 'namespace', getDeclarationNameNode(node), node);
      return;
    }
    case 'type_definition': {
      addTypeAliasSymbol(node, filePath, symbols);
      return;
    }
    default:
      return;
  }
}
