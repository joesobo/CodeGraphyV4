import type Parser from 'tree-sitter';

export function getStringSpecifier(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case 'string': {
      const fragment = node.namedChildren.find((child) => child.type === 'string_fragment');
      if (fragment) {
        return fragment.text;
      }

      return node.text.length >= 2 ? node.text.slice(1, -1) : null;
    }
    case 'interpreted_string_literal': {
      const fragment = node.namedChildren.find((child) => child.type === 'interpreted_string_literal_content');
      return fragment?.text ?? null;
    }
    default:
      return null;
  }
}
