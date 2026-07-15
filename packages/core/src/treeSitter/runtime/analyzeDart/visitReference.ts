import type Parser from 'tree-sitter';
import type { SymbolWalkState } from '../analyze/model';
import { handleDartAliasTypeIdentifierReference, handleDartAliasTypeReference } from './aliasReferences';
import { handleDartIdentifierReference } from './identifierReferences';
import { handleDartImportedTypeCall } from './importedCalls';
import type { DartVisitContext } from './visitContext';

export function visitDartReference(node: Parser.SyntaxNode, state: SymbolWalkState, context: DartVisitContext): void {
  if (node.type === 'declaration' || node.type === 'initialized_identifier') {
    handleDartAliasTypeReference(
      node,
      context.filePath,
      context.relations,
      context.importedSymbolPaths,
      context.importedSymbolKinds,
      state.currentSymbolId,
    );
  }
  if (node.type === 'type_identifier') {
    handleDartAliasTypeIdentifierReference(
      node,
      context.filePath,
      context.relations,
      context.importedSymbolPaths,
      context.importedSymbolKinds,
      state.currentSymbolId,
    );
  }
  if (node.type === 'identifier') visitDartIdentifier(node, state, context);
}

function visitDartIdentifier(node: Parser.SyntaxNode, state: SymbolWalkState, context: DartVisitContext): void {
  handleDartImportedTypeCall(
    node,
    context.filePath,
    context.relations,
    context.importedSymbolPaths,
    context.importedSymbolKinds,
    context.localValueReturningMethods,
    state.currentSymbolId,
  );
  handleDartIdentifierReference(
    node,
    context.filePath,
    context.relations,
    context.importedSymbolPaths,
    state.currentSymbolId,
    state.currentSymbolKind,
  );
}
