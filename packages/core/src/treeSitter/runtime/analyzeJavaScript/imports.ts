import type Parser from 'tree-sitter';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { TREE_SITTER_SOURCE_IDS } from '../languages';
import { resolveTreeSitterImportPath } from '../resolve';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getStringSpecifier } from '../analyze/nodes';
import { addRelation, createSymbol } from '../analyze/results';
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

function addReexportRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
  metadata: NonNullable<IAnalysisRelation['metadata']>,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    kind: 'reexport',
    sourceId: TREE_SITTER_SOURCE_IDS.import,
    fromFilePath: filePath,
    ...(fromSymbolId ? { fromSymbolId } : {}),
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
    metadata,
  });
}

function readExportSpecifierName(
  exportSpecifier: Parser.SyntaxNode,
  field: 'name' | 'alias',
): string | undefined {
  return exportSpecifier.childForFieldName(field)?.text;
}

export function handleJavaScriptExportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[] = [],
  symbolsEnabled = true,
): void {
  const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
  if (!specifier) return;
  const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
  const exportClause = node.namedChildren.find((child) => child.type === 'export_clause');
  if (!exportClause) {
    addReexportRelation(relations, filePath, specifier, resolvedPath, { reexportAll: true });
    return;
  }

  for (const exported of exportClause.namedChildren.filter(child => child.type === 'export_specifier')) {
    const importedName = readExportSpecifierName(exported, 'name');
    if (!importedName) continue;
    const exportedName = readExportSpecifierName(exported, 'alias') ?? importedName;
    const alias = symbolsEnabled && exportedName !== importedName
      ? createSymbol(filePath, 'alias', exportedName, exported)
      : undefined;
    if (alias) symbols.push(alias);
    addReexportRelation(relations, filePath, specifier, resolvedPath, {
      reexport: true,
      importedName,
      exportedName,
    }, alias?.id);
  }
}
