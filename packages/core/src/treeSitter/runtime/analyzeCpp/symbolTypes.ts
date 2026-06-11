import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../analyze/model';
import { handleCFamilySymbol } from '../analyzeCFamily/symbols';
import { addNamedSymbol } from './symbolCreate';
import {
  getDeclarationNameNode,
} from './symbolLookupNames';
import {
  type CppSymbolWalkState,
} from './symbolModel';
import { getTemplateDeclarationNameNode } from './symbolTypeTemplates';

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
  const declaration = readCppTemplateDeclarationTarget(node);
  const nameNode = declaration ? getTemplateDeclarationNameNode(declaration) : null;
  addNamedSymbol(symbols, filePath, 'template', nameNode, declaration ?? node);

  return {
    nextContext: {
      ...state,
      suppressTypeDeclarationSymbol: true,
    },
  };
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

function readCppTemplateDeclarationTarget(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
  return node.namedChildren.at(-1);
}

function cppTypeSymbolKind(node: Parser.SyntaxNode): string {
  if (node.type === 'class_specifier') {
    return 'class';
  }

  return node.type === 'union_specifier' ? 'union' : 'struct';
}
