import { collectImportBindings } from '../analyze/imports';
import { addImportRelation, addTypeImportRelation } from '../analyze/results';
import { collectTypeImportBindings } from './typeImports/collect';
import type { ImportStatementContext } from './imports';

export function addValueImportRelations(context: ImportStatementContext): void {
  const statementBindings = collectImportBindings(
    context.node,
    context.specifier,
    context.resolvedPath,
    context.importedBindings,
  );

  if (statementBindings.length === 0) {
    addImportRelation(context.relations, context.filePath, context.specifier, context.resolvedPath);
    return;
  }

  for (const binding of statementBindings) {
    addImportRelation(
      context.relations,
      context.filePath,
      context.specifier,
      context.resolvedPath,
      undefined,
      undefined,
      binding,
    );
  }
}

export function addTypeImportRelations(context: ImportStatementContext): void {
  const typeBindings = collectTypeImportBindings(context.node, context.specifier, context.resolvedPath);
  if (typeBindings.length === 0) {
    addTypeImportRelation(context.relations, context.filePath, context.specifier, context.resolvedPath);
    return;
  }

  for (const binding of typeBindings) {
    context.importedBindings.set(binding.localName ?? binding.importedName ?? context.specifier, binding);
    addTypeImportRelation(context.relations, context.filePath, context.specifier, context.resolvedPath, binding);
  }
}
