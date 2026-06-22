import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { createSymbol } from '../analyze/results';

export function getDartDeclarationName(node: Parser.SyntaxNode): string | null {
  return node.childForFieldName('name')?.text
    ?? node.namedChildren.find((child) => child.type === 'identifier')?.text
    ?? node.namedChildren.find((child) => child.type === 'type_identifier')?.text
    ?? null;
}

export function getDartFunctionSignature(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  if (node.type === 'function_signature') {
    return node;
  }

  return node.namedChildren.find((child) => child.type === 'function_signature') ?? null;
}

export function addDartNamedSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  node: Parser.SyntaxNode,
): void {
  const name = getDartDeclarationName(node);
  if (name) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }
}

export function addDartIdentifierSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  node: Parser.SyntaxNode,
): void {
  symbols.push(createSymbol(filePath, kind, node.text, node));
}
