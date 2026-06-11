import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../analyze/model';
import { createSymbolId } from '../analyze/results';
import { addNamedSymbol } from './symbolCreate';
import {
  getFunctionNameNode,
  readQualifiedFunctionDeclaratorText,
} from './symbolNames';
import type { CppSymbolWalkState } from './symbolModel';

export function handleCppFunctionDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  const nameNode = getFunctionNameNode(node);
  if (!nameNode) {
    return { skipChildren: true };
  }

  const name = qualifyCppFunctionName(node, nameNode.text, state.currentClassName);
  const kind = isCppMethodDefinition(node, state.currentClassName) ? 'method' : 'function';
  addNamedSymbol(symbols, filePath, kind, nameNode, node, name);

  return {
    nextContext: {
      ...state,
      currentFunctionSymbolId: createSymbolId(filePath, kind, name),
      currentSymbolId: createSymbolId(filePath, kind, name),
    },
  };
}

function isCppMethodDefinition(node: Parser.SyntaxNode, currentClassName: string | undefined): boolean {
  if (currentClassName) {
    return true;
  }

  return Boolean(readQualifiedFunctionDeclaratorText(node));
}

function qualifyCppFunctionName(
  node: Parser.SyntaxNode,
  functionName: string,
  currentClassName: string | undefined,
): string {
  if (currentClassName) {
    return `${currentClassName}::${functionName}`;
  }

  return readQualifiedFunctionDeclaratorText(node) ?? functionName;
}
