import type Parser from 'tree-sitter';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { TREE_SITTER_SOURCE_IDS } from '../languages';
import { resolveTreeSitterImportPath } from '../resolve';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getStringSpecifier } from '../analyze/nodes';
import { addRelation, createFileTarget } from '../analyze/results';
import { hasValueImport } from './importKinds';
import { addTypeImportRelations, addValueImportRelations } from './importRelations';
import { hasDirectTypeKeyword, hasTypeSpecifierImport } from './typeImports/markers';

export type ImportStatementContext = {
  filePath: string;
  importedBindings: Map<string, ImportedBinding>;
  node: Parser.SyntaxNode;
  relations: IAnalysisRelationshipEvidence[];
  resolvedPath: string | null;
  specifier: string;
};

export function handleJavaScriptImportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelationshipEvidence[],
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
  relations: IAnalysisRelationshipEvidence[],
): void {
  const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
  if (!specifier) {
    return;
  }

  const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
  addRelation(relations, {
    edgeType: 'reexport',
    sourceId: TREE_SITTER_SOURCE_IDS.reexport,
    from: { kind: 'file', filePath },
    target: createFileTarget(resolvedPath, specifier),
  });
}
