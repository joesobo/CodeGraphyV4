import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleDartLibraryImport } from './imports';
import {
  handleDartClassDefinition,
  handleDartFunctionSignature,
  handleDartTypeDeclaration,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitDartNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedTypePaths: Map<string, string | null>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'library_import') {
    handleDartLibraryImport(node, filePath, workspaceRoot, relations);
    const importRelation = relations.at(-1);
    if (importRelation?.kind === 'import') {
      const typeName = toDartTypeName(importRelation.specifier ?? '');
      if (typeName) {
        importedTypePaths.set(typeName, importRelation.resolvedPath ?? null);
      }
    }
    return { skipChildren: true };
  }

  if (node.type === 'class_definition') {
    handleDartClassDefinition(node, filePath, relations, symbols, symbolsEnabled, importedTypePaths);
    return;
  }

  if (node.type === 'mixin_declaration' || node.type === 'enum_declaration') {
    if (!symbolsEnabled) {
      return;
    }
    handleDartTypeDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'method_signature') {
    return symbolsEnabled
      ? handleDartFunctionSignature(node, filePath, symbols)
      : undefined;
  }

  if (node.type === 'function_signature' && node.parent?.type !== 'method_signature') {
    return symbolsEnabled
      ? handleDartFunctionSignature(node, filePath, symbols)
      : undefined;
  }

  return;
}

export function analyzeDartFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const importedTypePaths = new Map<string, string | null>();
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node) =>
    visitDartNode(node, filePath, workspaceRoot, relations, symbols, importedTypePaths, symbolsEnabled),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function toDartTypeName(specifier: string): string | null {
  const basename = specifier.split('/').pop()?.replace(/\.dart$/, '');
  if (!basename) {
    return null;
  }

  return basename
    .split('_')
    .filter(Boolean)
    .map(part => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('');
}
