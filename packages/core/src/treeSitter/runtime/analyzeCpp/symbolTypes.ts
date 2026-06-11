import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../analyze/model';
import { handleCFamilySymbol } from '../analyzeCFamily/symbols';
import { addNamedSymbol } from './symbolCreate';
import {
  getDeclarationNameNode,
  getFunctionNameNode,
} from './symbolNames';
import {
  CLASS_LIKE_NODE_TYPES,
  type CppSymbolWalkState,
} from './symbolModel';

export function handleCppAliasDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<CppSymbolWalkState> {
  addNamedSymbol(symbols, filePath, 'alias', getDeclarationNameNode(node), node);
  return { skipChildren: true };
}

export function handleCppCFamilySymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<CppSymbolWalkState> | void {
  return handleCFamilySymbol(node, filePath, symbols) as TreeWalkAction<CppSymbolWalkState> | void;
}

export function handleCppTemplateDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> {
  const declaration = node.namedChildren.find((child) => CLASS_LIKE_NODE_TYPES.has(child.type))
    ?? node.namedChildren.find((child) => child.type === 'function_definition' || child.type === 'declaration')
    ?? node.namedChildren.at(-1);
  const nameNode = declaration ? getTemplateDeclarationNameNode(declaration) : null;
  addNamedSymbol(symbols, filePath, 'template', nameNode, declaration ?? node);

  return {
    nextContext: {
      ...state,
      suppressTypeDeclarationSymbol: true,
    },
  };
}

function getTemplateDeclarationNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  if (node.type === 'function_definition' || node.type === 'declaration') {
    return getFunctionNameNode(node) ?? getDeclarationNameNode(node);
  }

  return getDeclarationNameNode(node);
}

export function handleCppTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> {
  const nameNode = getDeclarationNameNode(node);
  const typeName = nameNode?.text;

  if (!state.suppressTypeDeclarationSymbol) {
    addNamedSymbol(symbols, filePath, cppTypeSymbolKind(node), nameNode, node);
  }

  return {
    nextContext: {
      ...state,
      currentClassName: typeName ?? state.currentClassName,
      suppressTypeDeclarationSymbol: false,
    },
  };
}

function cppTypeSymbolKind(node: Parser.SyntaxNode): string {
  if (node.type === 'class_specifier') {
    return 'class';
  }

  return node.type === 'union_specifier' ? 'union' : 'struct';
}
