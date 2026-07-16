import type Parser from 'tree-sitter';

export function registerDartLocalType(
  node: Parser.SyntaxNode,
  filePath: string,
  kind: string,
  symbolPaths: Map<string, string | null>,
  symbolKinds: Map<string, string>,
): void {
  const name = node.childForFieldName('name')?.text
    ?? node.namedChildren.find(child => child.type === 'identifier' || child.type === 'type_identifier')?.text;
  if (name) {
    symbolPaths.set(name, filePath);
    symbolKinds.set(name, kind);
  }
}

export function getDartImportedSymbolKind(node: Parser.SyntaxNode): string {
  return DART_SYMBOL_KIND_BY_NODE_TYPE[node.type] ?? 'class';
}

const DART_SYMBOL_KIND_BY_NODE_TYPE: Readonly<Record<string, string>> = {
  enum_declaration: 'enum',
  extension_declaration: 'extension',
  function_signature: 'function',
  mixin_declaration: 'mixin',
  type_alias: 'alias',
};

export function getDartTypeDeclarationKind(node: Parser.SyntaxNode): string {
  return getDartImportedSymbolKind(node);
}
