import type Parser from 'tree-sitter';
import { getImportClause, getNamedImportSpecifiers, isImportSpecifierNode } from './clause';

function childrenOf(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return node.children;
}

function isTypeKeyword(node: Parser.SyntaxNode): boolean {
  return node.type === 'type';
}

export function hasDirectTypeKeyword(node: Parser.SyntaxNode): boolean {
  return childrenOf(node).some(isTypeKeyword);
}

export function isTypeImportSpecifier(node: Parser.SyntaxNode): boolean {
  return isImportSpecifierNode(node) && childrenOf(node).some(isTypeKeyword);
}

export function hasTypeSpecifierImport(node: Parser.SyntaxNode): boolean {
  return getNamedImportSpecifiers(getImportClause(node)).some(isTypeImportSpecifier);
}
