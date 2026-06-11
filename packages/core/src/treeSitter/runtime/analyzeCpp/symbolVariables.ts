import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../analyze/model';
import {
  addNamedSymbol,
  createRangeSignature,
} from './symbolCreate';
import {
  getDeclaratorNameNode,
  getDeclaratorNameNodes,
  getFunctionNameNode,
  hasFunctionDeclarator,
  isInsideClassLike,
} from './symbolNames';
import type { CppSymbolWalkState } from './symbolModel';

export function handleCppDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (state.currentFunctionSymbolId) {
    for (const nameNode of getDeclaratorNameNodes(node)) {
      addNamedSymbol(symbols, filePath, 'local', nameNode, node);
    }
    return { skipChildren: true };
  }

  if (hasFunctionDeclarator(node)) {
    return { skipChildren: true };
  }

  if (isInsideClassLike(node)) {
    return;
  }

  const kind = isCppConstantDeclaration(node) ? 'constant' : 'global';
  for (const nameNode of getDeclaratorNameNodes(node)) {
    addNamedSymbol(symbols, filePath, kind, nameNode, node);
  }
  return { skipChildren: true };
}

export function handleCppFieldDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (hasFunctionDeclarator(node)) {
    addPureVirtualMethodSymbol(node, filePath, symbols, state);
    return { skipChildren: true };
  }

  for (const nameNode of getDeclaratorNameNodes(node)) {
    addNamedSymbol(symbols, filePath, 'field', nameNode, node);
  }
  return { skipChildren: true };
}

function addPureVirtualMethodSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): void {
  const nameNode = getFunctionNameNode(node);
  if (!nameNode || !state.currentClassName || !isPureVirtualDeclaration(node)) {
    return;
  }

  addNamedSymbol(symbols, filePath, 'method', nameNode, node, `${state.currentClassName}::${nameNode.text}`);
  addCppParameterSymbols(node, filePath, symbols);
}

export function handleCppForRangeLoop(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): void {
  if (!state.currentFunctionSymbolId) {
    return;
  }

  addNamedSymbol(symbols, filePath, 'local', getForRangeLoopNameNode(node), node);
}

function getForRangeLoopNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  for (const child of node.namedChildren) {
    if (!isRangeLoopVariableDeclarator(child)) {
      continue;
    }

    const nameNode = getDeclaratorNameNode(child);
    if (nameNode?.text) {
      return nameNode;
    }
  }

  return null;
}

function isRangeLoopVariableDeclarator(node: Parser.SyntaxNode): boolean {
  return node.type === 'reference_declarator'
    || node.type === 'pointer_declarator'
    || node.type === 'identifier';
}

export function handleCppParameterDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (!state.currentFunctionSymbolId) {
    return;
  }

  const nameNode = getDeclaratorNameNode(node);
  addNamedSymbol(symbols, filePath, 'parameter', nameNode, node, undefined, createRangeSignature(node));
  return { skipChildren: true };
}

function addCppParameterSymbols(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  for (const child of node.namedChildren) {
    if (child.type === 'parameter_declaration') {
      addNamedSymbol(
        symbols,
        filePath,
        'parameter',
        getDeclaratorNameNode(child),
        child,
        undefined,
        createRangeSignature(child),
      );
      continue;
    }

    addCppParameterSymbols(child, filePath, symbols);
  }
}

function isCppConstantDeclaration(node: Parser.SyntaxNode): boolean {
  return /\b(?:const|constexpr)\b/.test(node.text.split(/[=;]/, 1)[0] ?? '');
}

function isPureVirtualDeclaration(node: Parser.SyntaxNode): boolean {
  return /=\s*0\s*;?$/.test(node.text.trim());
}
