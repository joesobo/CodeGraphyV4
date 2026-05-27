import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { TREE_SITTER_SOURCE_IDS } from '../languages';
import { resolveTreeSitterImportPath } from '../resolve';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getStringSpecifier } from '../analyze/nodes';
import { addRelation } from '../analyze/results';
import { hasValueImport } from './importKinds';
import { addTypeImportRelations, addValueImportRelations } from './importRelations';
import { hasDirectTypeKeyword, hasTypeSpecifierImport } from './typeImports/markers';

export type ImportStatementContext = {
  filePath: string;
  importedBindings: Map<string, ImportedBinding>;
  node: Parser.SyntaxNode;
  relations: IAnalysisRelation[];
  resolvedPath: string | null;
  specifier: string;
};

export function handleJavaScriptImportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
  if (!specifier) {
    return { skipChildren: true };
  }

  const context = {
    filePath,
    importedBindings,
    node,
    relations,
    resolvedPath: resolveTreeSitterImportPath(filePath, specifier),
    specifier,
  };

  if (hasValueImport(node)) {
    addValueImportRelations(context);
  }

  if (hasDirectTypeKeyword(node) || hasTypeSpecifierImport(node)) {
    addTypeImportRelations(context);
  }

  return { skipChildren: true };
}

export function handleJavaScriptExportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
): void {
  const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
  if (!specifier) {
    return;
  }

  const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
  addRelation(relations, {
    kind: 'reexport',
    sourceId: TREE_SITTER_SOURCE_IDS.reexport,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}
