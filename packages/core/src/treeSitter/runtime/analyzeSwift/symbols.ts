import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';

function getSwiftTypeKind(node: Parser.SyntaxNode): 'actor' | 'class' | 'enum' | 'struct' {
  const declaration = node.text.trimStart();
  if (declaration.startsWith('struct ')) {
    return 'struct';
  }

  if (declaration.startsWith('enum ')) {
    return 'enum';
  }

  if (declaration.startsWith('actor ')) {
    return 'actor';
  }

  return 'class';
}

function isInsideSwiftType(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (
      current.type === 'class_declaration'
      || current.type === 'protocol_declaration'
      || current.type === 'extension_declaration'
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function getSwiftDeclarationName(node: Parser.SyntaxNode): string | null {
  return node.childForFieldName('name')?.text
    ?? node.namedChildren.find((child) =>
      child.type === 'simple_identifier' || child.type === 'type_identifier',
    )?.text
    ?? null;
}

export function handleSwiftTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
): void {
  const kind = node.type === 'protocol_declaration' ? 'protocol' : getSwiftTypeKind(node);
  const name = getSwiftDeclarationName(node);
  if (name) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }

  for (const inheritance of node.descendantsOfType('inheritance_specifier')) {
    const specifier = inheritance.childForFieldName('inherits_from')?.text
      ?? inheritance.namedChildren[0]?.text;
    if (specifier) {
      addInheritRelation(relations, filePath, specifier, null);
    }
  }
}

export function handleSwiftFunctionDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> {
  const name = getSwiftDeclarationName(node);
  if (name) {
    symbols.push(createSymbol(filePath, isInsideSwiftType(node) ? 'method' : 'function', name, node));
  }

  return { skipChildren: true };
}
