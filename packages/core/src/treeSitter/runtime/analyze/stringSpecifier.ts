import type Parser from 'tree-sitter';

type StringSpecifierReader = (node: Parser.SyntaxNode) => string | null;

function stripQuotedText(node: Parser.SyntaxNode): string | null {
  return node.text.length >= 2 ? node.text.slice(1, -1) : null;
}

function readTreeSitterString(node: Parser.SyntaxNode): string | null {
  const fragment = node.namedChildren.find((child) => child.type === 'string_fragment');
  return fragment?.text ?? stripQuotedText(node);
}

function readInterpretedStringLiteral(node: Parser.SyntaxNode): string | null {
  const fragment = node.namedChildren.find((child) => child.type === 'interpreted_string_literal_content');
  return fragment?.text ?? null;
}

const STRING_SPECIFIER_READERS: Record<string, StringSpecifierReader> = {
  interpreted_string_literal: readInterpretedStringLiteral,
  string: readTreeSitterString,
  string_literal: stripQuotedText,
};

export function getStringSpecifier(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  return STRING_SPECIFIER_READERS[node.type]?.(node) ?? null;
}
