import type Parser from 'tree-sitter';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbolId } from '../analyze/results';
import {
  addHaskellLocalBindSymbols,
  addHaskellTopLevelBindSymbol,
  handleHaskellDeclaration,
} from './symbols';
import type { HaskellVisitContext } from './visitor';

export function visitHaskellBind(
  node: Parser.SyntaxNode,
  context: HaskellVisitContext,
): TreeWalkAction<SymbolWalkState> | void {
  const symbolKind = addHaskellBindSymbols(node, context);
  const name = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
  return name ? { nextContext: { currentSymbolId: createSymbolId(context.filePath, symbolKind, name) } } : undefined;
}

function addHaskellBindSymbols(node: Parser.SyntaxNode, context: HaskellVisitContext): string {
  if (!context.symbolsEnabled) return 'function';
  if (node.type === 'function') {
    handleHaskellDeclaration(node, context.filePath, context.symbols);
    return 'function';
  }
  if (node.parent?.type === 'declarations') {
    return addHaskellTopLevelBindSymbol(node, context.filePath, context.symbols) ?? 'function';
  }
  if (node.parent?.type === 'local_binds') addHaskellLocalBindSymbols(node, context.filePath, context.symbols);
  return 'function';
}
