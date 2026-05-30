import type Parser from 'tree-sitter';
import type {
  IAnalysisRelationshipEvidence,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';
import {
  addDartNamedSymbol,
  getDartDeclarationName,
  getDartFunctionSignature,
} from './declarations';

export function handleDartClassDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelationshipEvidence[],
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
