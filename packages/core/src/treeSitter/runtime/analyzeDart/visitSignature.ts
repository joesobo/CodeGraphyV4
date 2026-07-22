import type Parser from 'tree-sitter';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addDartSignatureReferenceRelations } from './signatureReferences';
import { handleDartFunctionSignature } from './symbols';
import { registerDartValueReturningMethod } from './valueMethods';
import type { DartVisitContext } from './visitContext';

export interface DartSignatureVisitResult {
  handled: boolean;
  action: TreeWalkAction<SymbolWalkState> | void;
}

export function visitDartSignature(node: Parser.SyntaxNode, context: DartVisitContext): DartSignatureVisitResult {
  if (node.type === 'method_signature') return { handled: true, action: visitDartMethodSignature(node, context) };
  if (node.type === 'function_signature' && node.parent?.type !== 'method_signature') {
    return { handled: true, action: visitDartFunctionSignature(node, 'function', context) };
  }
  return { handled: false, action: undefined };
}

function visitDartMethodSignature(
  node: Parser.SyntaxNode,
  context: DartVisitContext,
): TreeWalkAction<SymbolWalkState> | void {
  registerDartValueReturningMethod(
    node,
    context.filePath,
    context.importedSymbolPaths,
    context.importedSymbolKinds,
    context.localValueReturningMethods,
  );
  return visitDartFunctionSignature(node, 'method', context);
}

function visitDartFunctionSignature(
  node: Parser.SyntaxNode,
  kind: string,
  context: DartVisitContext,
): TreeWalkAction<SymbolWalkState> | void {
  const targetSymbols = context.symbolsEnabled ? context.symbols : [];
  const previousCount = targetSymbols.length;
  const action = handleDartFunctionSignature(node, context.filePath, targetSymbols);
  const symbolId = context.symbolsEnabled && targetSymbols.length > previousCount ? targetSymbols.at(-1)?.id : undefined;
  context.pendingSymbolContext.value = { id: symbolId, kind };
  addDartSignatureReferenceRelations(node, context.filePath, context.relations, context.importedSymbolPaths, symbolId);
  return action;
}
