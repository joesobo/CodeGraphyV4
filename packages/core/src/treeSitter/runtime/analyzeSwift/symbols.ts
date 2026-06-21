import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';
import { getSwiftDeclarationName, getSwiftTypeKind, isInsideSwiftType } from './declarations';

export function handleSwiftTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
  resolveInheritedTypePath: (typeName: string) => string | null,
): void {
  const kind = node.type === 'protocol_declaration' ? 'protocol' : getSwiftTypeKind(node);
  const name = getSwiftDeclarationName(node);
  if (name && symbolsEnabled) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }

  for (const inheritance of node.descendantsOfType('inheritance_specifier')) {
    const specifier = inheritance.childForFieldName('inherits_from')?.text
      ?? inheritance.namedChildren[0]?.text;
    if (specifier) {
      addInheritRelation(relations, filePath, specifier, resolveInheritedTypePath(specifier));
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
