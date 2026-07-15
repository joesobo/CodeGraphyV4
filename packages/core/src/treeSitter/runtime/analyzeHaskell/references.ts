import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addCallRelation, addReferenceRelation } from '../analyze/results';

export function handleHaskellImportedCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedCallablePaths: ReadonlyMap<string, string>,
  name: string,
  currentSymbolId?: string,
): void {
  if (node.parent?.type !== 'apply') return;
  const resolvedPath = importedCallablePaths.get(name);
  if (!resolvedPath) return;
  addCallRelation(relations, filePath, {
    importedName: name,
    localName: name,
    resolvedPath,
    specifier: name,
  }, currentSymbolId);
}

export function handleHaskellImportedTypeReference(
  filePath: string,
  relations: IAnalysisRelation[],
  importedTypePaths: ReadonlyMap<string, string>,
  name: string,
  currentSymbolId?: string,
): void {
  const resolvedPath = importedTypePaths.get(name);
  if (resolvedPath) addReferenceRelation(relations, filePath, name, resolvedPath, currentSymbolId);
}
