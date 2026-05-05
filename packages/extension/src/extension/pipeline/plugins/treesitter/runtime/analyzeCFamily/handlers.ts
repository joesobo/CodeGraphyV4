import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import {
  addCxxTypeSymbol,
  addFunctionSymbol,
  addNamedSymbol,
  addTypeAliasSymbol,
} from './emit';
import type { CFamilySymbolContext, CFamilySymbolHandler } from './model';
import {
  getDeclarationNameNode,
  hasFunctionDeclarator,
  isInsideClassLike,
} from './names';

function handleFunctionDefinition(
  context: CFamilySymbolContext,
): TreeWalkAction<SymbolWalkState> {
  const kind = isInsideClassLike(context.node) ? 'method' : 'function';
  return addFunctionSymbol(context.node, context.filePath, context.symbols, kind);
}

function handleDeclaration(
  context: CFamilySymbolContext,
): TreeWalkAction<SymbolWalkState> | void {
  if (hasFunctionDeclarator(context.node)) {
    return addFunctionSymbol(context.node, context.filePath, context.symbols, 'function');
  }
}

function handleFieldDeclaration(
  context: CFamilySymbolContext,
): TreeWalkAction<SymbolWalkState> | void {
  if (hasFunctionDeclarator(context.node)) {
    return addFunctionSymbol(context.node, context.filePath, context.symbols, 'method');
  }
}

function handleCxxTypeDeclaration(context: CFamilySymbolContext): void {
  addCxxTypeSymbol(context.node, context.filePath, context.symbols);
}

function handleEnumSpecifier(
  context: CFamilySymbolContext,
): TreeWalkAction<SymbolWalkState> {
  addNamedSymbol(context.symbols, context.filePath, 'enum', getDeclarationNameNode(context.node), context.node);
  return { skipChildren: true };
}

function handleNamespaceDefinition(context: CFamilySymbolContext): void {
  addNamedSymbol(context.symbols, context.filePath, 'namespace', getDeclarationNameNode(context.node), context.node);
}

function handleTypeDefinition(context: CFamilySymbolContext): void {
  addTypeAliasSymbol(context.node, context.filePath, context.symbols);
}

export const C_FAMILY_SYMBOL_HANDLERS: Record<string, CFamilySymbolHandler> = {
  class_specifier: handleCxxTypeDeclaration,
  declaration: handleDeclaration,
  enum_specifier: handleEnumSpecifier,
  field_declaration: handleFieldDeclaration,
  function_definition: handleFunctionDefinition,
  namespace_definition: handleNamespaceDefinition,
  struct_specifier: handleCxxTypeDeclaration,
  type_definition: handleTypeDefinition,
  union_specifier: handleCxxTypeDeclaration,
};
