import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../analyze/model';
import {
  addNamedSymbol,
  createRangeSignature,
} from './symbolCreate';
import { getDeclaratorNameNode } from './symbolDeclaratorNames';
import type { CppSymbolWalkState } from './symbolModel';

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
