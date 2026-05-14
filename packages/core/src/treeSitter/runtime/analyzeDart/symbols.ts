import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';

function getDartDeclarationName(node: Parser.SyntaxNode): string | null {
  return node.childForFieldName('name')?.text
    ?? node.namedChildren.find((child) => child.type === 'identifier')?.text
    ?? null;
}

function getDartFunctionSignature(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  if (node.type === 'function_signature') {
    return node;
  }

  return node.namedChildren.find((child) => child.type === 'function_signature') ?? null;
}

function addDartNamedSymbol(
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

export function handleDartClassDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
): void {
  addDartNamedSymbol(symbols, filePath, 'class', node);

  const superclass = node.childForFieldName('superclass');
  if (!superclass) {
    return;
  }

  for (const typeIdentifier of superclass.descendantsOfType('type_identifier')) {
    addInheritRelation(relations, filePath, typeIdentifier.text, null);
  }
}

export function handleDartTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  if (node.type === 'mixin_declaration') {
    addDartNamedSymbol(symbols, filePath, 'mixin', node);
    return;
  }

  addDartNamedSymbol(symbols, filePath, 'enum', node);
}

export function handleDartFunctionSignature(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> {
  const signature = getDartFunctionSignature(node);
  const name = signature ? getDartDeclarationName(signature) : null;
  if (name) {
    symbols.push(createSymbol(
      filePath,
      node.type === 'method_signature' ? 'method' : 'function',
      name,
      node,
    ));
  }

  return { skipChildren: true };
}
