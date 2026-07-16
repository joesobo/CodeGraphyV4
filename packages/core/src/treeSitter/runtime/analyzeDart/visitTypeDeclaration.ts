import type Parser from 'tree-sitter';
import type { SymbolWalkState } from '../analyze/model';
import { addDartTypeDeclarationReferenceRelations } from './declarationReferences';
import { handleDartClassDefinition, handleDartTypeDeclaration } from './symbols';
import { getDartTypeDeclarationKind, registerDartLocalType } from './symbolRegistration';
import type { DartVisitContext } from './visitContext';

export function isDartTypeDeclaration(node: Parser.SyntaxNode): boolean {
  return DART_TYPE_DECLARATIONS.has(node.type);
}

const DART_TYPE_DECLARATIONS = new Set([
  'class_definition',
  'mixin_declaration',
  'enum_declaration',
  'type_alias',
  'extension_declaration',
]);

export function visitDartTypeDeclaration(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  context: DartVisitContext,
): void {
  if (node.type === 'class_definition') {
    registerDartLocalType(node, context.filePath, 'class', context.importedSymbolPaths, context.importedSymbolKinds);
    handleDartClassDefinition(
      node,
      context.filePath,
      context.relations,
      context.symbols,
      context.symbolsEnabled,
      context.importedSymbolPaths,
    );
    return;
  }
  registerDartLocalType(
    node,
    context.filePath,
    getDartTypeDeclarationKind(node),
    context.importedSymbolPaths,
    context.importedSymbolKinds,
  );
  addDartTypeDeclarationReferenceRelations(
    node,
    context.filePath,
    context.relations,
    context.importedSymbolPaths,
    state.currentSymbolId,
  );
  if (context.symbolsEnabled) handleDartTypeDeclaration(node, context.filePath, context.symbols);
}
