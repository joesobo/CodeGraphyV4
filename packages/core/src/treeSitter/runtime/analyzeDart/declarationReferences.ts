import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { handleDartTypeReference } from './typeReferences';

export function addDartTypeDeclarationReferenceRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
): void {
  if (node.type !== 'type_alias' && node.type !== 'extension_declaration') return;
  const declarationName = node.namedChildren.find(child => child.type === 'type_identifier');
  for (const typeIdentifier of node.descendantsOfType('type_identifier')) {
    if (typeIdentifier !== declarationName) handleDartTypeReference(typeIdentifier, filePath, relations, symbolPaths, currentSymbolId);
  }
}
