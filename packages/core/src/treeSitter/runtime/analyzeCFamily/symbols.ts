import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { C_FAMILY_SYMBOL_HANDLERS } from './handlers';

export function handleCFamilySymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  return C_FAMILY_SYMBOL_HANDLERS[node.type]?.({ filePath, node, symbols });
}
