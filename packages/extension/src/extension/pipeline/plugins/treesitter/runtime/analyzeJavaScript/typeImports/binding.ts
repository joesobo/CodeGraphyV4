import type Parser from 'tree-sitter';
import type { ImportedBinding } from '../../analyze/model';
import type { TypeImportContext } from './model';

export function createDefaultTypeBinding(
  child: Parser.SyntaxNode,
  context: TypeImportContext,
): ImportedBinding {
  return {
    bindingKind: 'default',
    importedName: 'default',
    localName: child.text,
    resolvedPath: context.resolvedPath,
    specifier: context.specifier,
  };
}

export function collectNamespaceTypeBinding(
  child: Parser.SyntaxNode,
  context: TypeImportContext,
): ImportedBinding[] {
  const localName = child.namedChildren.find((namedChild) => namedChild.type === 'identifier')?.text;
  if (!localName) {
    return [];
  }

  return [{
    bindingKind: 'namespace',
    importedName: '*',
    localName,
    resolvedPath: context.resolvedPath,
    specifier: context.specifier,
  }];
}

export function createNamedTypeBinding(
  importSpecifier: Parser.SyntaxNode,
  context: TypeImportContext,
): ImportedBinding | null {
  const identifiers = importSpecifier.namedChildren.filter((namedChild) =>
    namedChild.type === 'identifier' || namedChild.type === 'type_identifier',
  );
  const importedName = identifiers[0]?.text;
  const localName = identifiers.at(-1)?.text;
  if (!localName) {
    return null;
  }

  return {
    bindingKind: 'named',
    importedName: importedName ?? localName,
    localName,
    resolvedPath: context.resolvedPath,
    specifier: context.specifier,
  };
}

export function isImportedBinding(binding: ImportedBinding | null): binding is ImportedBinding {
  return binding !== null;
}
