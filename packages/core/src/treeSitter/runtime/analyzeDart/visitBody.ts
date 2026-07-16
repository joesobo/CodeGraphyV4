import type Parser from 'tree-sitter';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { handleDartConstantDeclaration, handleDartLocalDeclaration } from './symbols';
import type { DartVisitContext } from './visitContext';

export function visitDartBody(
  node: Parser.SyntaxNode,
  context: DartVisitContext,
): TreeWalkAction<SymbolWalkState> | undefined {
  if (node.type === 'static_final_declaration_list' && context.symbolsEnabled) {
    handleDartConstantDeclaration(node, context.filePath, context.symbols);
  }
  if (node.type === 'local_variable_declaration' && context.symbolsEnabled) {
    handleDartLocalDeclaration(node, context.filePath, context.symbols);
  }
  if (node.type !== 'function_body' || !context.pendingSymbolContext.value) return undefined;
  const currentSymbol = context.pendingSymbolContext.value;
  context.pendingSymbolContext.value = undefined;
  return { nextContext: { currentSymbolId: currentSymbol.id, currentSymbolKind: currentSymbol.kind } };
}
