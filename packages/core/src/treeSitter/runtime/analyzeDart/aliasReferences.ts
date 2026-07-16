import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { handleDartTypeReference } from './typeReferences';

export function handleDartAliasTypeReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  symbolKinds: ReadonlyMap<string, string>,
  currentSymbolId?: string,
): void {
  for (const typeIdentifier of node.descendantsOfType('type_identifier')) {
    if (symbolKinds.get(typeIdentifier.text) === 'alias') {
      handleDartTypeReference(typeIdentifier, filePath, relations, symbolPaths, currentSymbolId);
    }
  }
}

export function handleDartAliasTypeIdentifierReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  symbolKinds: ReadonlyMap<string, string>,
  currentSymbolId?: string,
): void {
  if (symbolKinds.get(node.text) !== 'alias') return;
  const resolvedPath = symbolPaths.get(node.text);
  const exists = relations.some(relation =>
    relation.kind === 'reference'
    && relation.fromFilePath === filePath
    && relation.specifier === node.text
    && relation.resolvedPath === resolvedPath
    && relation.fromSymbolId === currentSymbolId
  );
  if (!exists) handleDartTypeReference(node, filePath, relations, symbolPaths, currentSymbolId);
}
