import type Parser from 'tree-sitter';

export function registerDartValueReturningMethod(
  node: Parser.SyntaxNode,
  filePath: string,
  symbolPaths: Map<string, string | null>,
  symbolKinds: Map<string, string>,
  localValueReturningMethods: Set<string>,
): void {
  const signature = node.namedChildren.find(child => child.type === 'function_signature');
  const returnType = signature?.namedChildren.find(child =>
    child.type === 'type_identifier' || child.type === 'void_type'
  )?.text;
  const name = signature?.childForFieldName('name')?.text
    ?? signature?.namedChildren.find(child => child.type === 'identifier')?.text;
  if (!name || returnType === 'void') return;
  symbolPaths.set(name, filePath);
  symbolKinds.set(name, 'method');
  localValueReturningMethods.add(name);
}
