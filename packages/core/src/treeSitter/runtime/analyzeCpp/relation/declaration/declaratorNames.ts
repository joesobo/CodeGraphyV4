import type Parser from 'tree-sitter';

export function readCppDeclaratorName(node: Parser.SyntaxNode | undefined): string | null {
  if (!node) {
    return null;
  }

  if (isCppDeclaratorIdentifier(node)) {
    return node.text;
  }

  return readQualifiedCppDeclaratorName(node) ?? readNestedCppDeclaratorName(node);
}

function isCppDeclaratorIdentifier(node: Parser.SyntaxNode): boolean {
  return node.type === 'field_identifier' || node.type === 'identifier';
}

function readQualifiedCppDeclaratorName(node: Parser.SyntaxNode): string | null {
  if (node.type !== 'qualified_identifier') {
    return null;
  }

  return readCppDeclaratorName(node.namedChildren.at(-1));
}

function readNestedCppDeclaratorName(node: Parser.SyntaxNode): string | null {
  const declarator = node.childForFieldName('declarator');
  if (declarator) {
    return readCppDeclaratorName(declarator);
  }

  return readFirstCppDeclaratorName(node.namedChildren);
}

function readFirstCppDeclaratorName(nodes: ReadonlyArray<Parser.SyntaxNode>): string | null {
  return nodes.reduce<string | null>((name, child) => name ?? readCppDeclaratorName(child), null);
}
