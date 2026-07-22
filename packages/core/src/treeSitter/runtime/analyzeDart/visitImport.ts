import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { handleDartLibraryImport } from './imports';
import { readDartSymbols } from './importedSymbols';
import { toDartTypeName } from './typeName';
import type { DartVisitContext } from './visitContext';

export function visitDartImport(node: Parser.SyntaxNode, context: DartVisitContext): TreeWalkAction<SymbolWalkState> {
  handleDartLibraryImport(node, context.filePath, context.workspaceRoot, context.relations);
  const relation = context.relations.at(-1);
  if (relation?.kind === 'import') registerDartImport(relation, context);
  return { skipChildren: true };
}

function registerDartImport(relation: IAnalysisRelation, context: DartVisitContext): void {
  const typeName = toDartTypeName(relation.specifier ?? '');
  if (typeName) context.importedSymbolPaths.set(typeName, relation.resolvedPath ?? null);
  if (!relation.resolvedPath) return;
  for (const symbol of readDartSymbols(relation.resolvedPath)) {
    context.importedSymbolPaths.set(symbol.name, relation.resolvedPath);
    context.importedSymbolKinds.set(symbol.name, symbol.kind);
  }
}
