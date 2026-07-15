import type Parser from 'tree-sitter';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { handleHaskellImport } from './imports';
import { readHaskellImportList } from './importList';
import { filterImportedHaskellCallableNames, filterImportedHaskellTypeNames } from './importSelection';
import { readImportedHaskellModuleNames } from './moduleNames';
import type { HaskellVisitContext } from './visitor';

export function visitHaskellImport(
  node: Parser.SyntaxNode,
  context: HaskellVisitContext,
): TreeWalkAction<SymbolWalkState> {
  handleHaskellImport(node, context.filePath, context.sourceRoot, context.relations);
  const relation = context.relations.at(-1);
  if (relation?.kind === 'import' && relation.resolvedPath) addImportedHaskellNames(node, relation.resolvedPath, context);
  return { skipChildren: true };
}

function addImportedHaskellNames(node: Parser.SyntaxNode, resolvedPath: string, context: HaskellVisitContext): void {
  const names = readImportedHaskellModuleNames(resolvedPath);
  const importList = readHaskellImportList(node);
  for (const name of filterImportedHaskellCallableNames(names, importList)) {
    context.importedCallablePaths.set(name, resolvedPath);
  }
  for (const name of filterImportedHaskellTypeNames(names, importList)) {
    context.importedTypePaths.set(name, resolvedPath);
  }
}
