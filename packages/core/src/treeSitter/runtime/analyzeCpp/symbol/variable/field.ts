import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../../../analyze/model';
import {
  addNamedSymbol,
  createRangeSignature,
} from '../create';
import { getDeclaratorNameNodes } from '../declarator/candidates';
import { getDeclaratorNameNode } from '../declarator/nameNode';
import { getFunctionNameNode } from '../lookup/names';
import type { CppSymbolWalkState } from '../model';
import { hasFunctionDeclarator } from '../scope';

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

function isPureVirtualDeclaration(node: Parser.SyntaxNode): boolean {
  return /=\s*0\s*;?$/.test(node.text.trim());
}
