import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addCallRelation } from '../analyze/results';
import { isFollowedByDartArgumentSelector } from './argumentSelector';
import { isDartSelectorCall } from './selector';

export function handleDartImportedTypeCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedTypePaths: ReadonlyMap<string, string | null>,
  importedSymbolKinds: ReadonlyMap<string, string>,
  localValueReturningMethods: ReadonlySet<string>,
  currentSymbolId?: string,
): void {
  const isSelectorCall = isDartSelectorCall(node);
  const resolvedPath = importedTypePaths.get(node.text)
    ?? (isSelectorCall && localValueReturningMethods.has(node.text) ? filePath : undefined);
  if (!resolvedPath || importedSymbolKinds.get(node.text) === 'enum' || !isFollowedByDartArgumentSelector(node)) return;
  addCallRelation(relations, filePath, {
    importedName: node.text,
    localName: node.text,
    resolvedPath,
    specifier: node.text,
  }, currentSymbolId, undefined, isSelectorCall ? node.text : undefined);
}
