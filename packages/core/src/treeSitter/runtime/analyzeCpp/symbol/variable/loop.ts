import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { addNamedSymbol } from '../create';
import { getDeclaratorNameNode } from '../declarator/nameNode';
import type { CppSymbolWalkState } from '../model';

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
