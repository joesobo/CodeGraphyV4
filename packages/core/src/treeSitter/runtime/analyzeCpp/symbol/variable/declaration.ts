import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../../../analyze/model';
import { addNamedSymbol } from '../create';
import { getDeclaratorNameNodes } from '../declarator/candidates';
import type { CppSymbolWalkState } from '../model';
import {
  hasFunctionDeclarator,
  isInsideClassLike,
} from '../scope';

export function handleCppDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (state.currentFunctionSymbolId) {
    addCppDeclarationSymbols(node, filePath, symbols, 'local');
    return { skipChildren: true };
  }

  if (hasFunctionDeclarator(node)) {
    return { skipChildren: true };
  }

  if (isInsideClassLike(node)) {
    return;
  }

  addCppDeclarationSymbols(node, filePath, symbols, isCppConstantDeclaration(node) ? 'constant' : 'global');
  return { skipChildren: true };
}

function addCppDeclarationSymbols(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  kind: 'constant' | 'global' | 'local',
): void {
  for (const nameNode of getDeclaratorNameNodes(node)) {
    addNamedSymbol(symbols, filePath, kind, nameNode, node);
  }
}

function isCppConstantDeclaration(node: Parser.SyntaxNode): boolean {
  return /\b(?:const|constexpr)\b/.test(node.text.split(/[=;]/, 1)[0] ?? '');
}
