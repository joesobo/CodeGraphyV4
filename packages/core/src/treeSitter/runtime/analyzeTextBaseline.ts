import * as path from 'node:path';
import type Parser from 'tree-sitter';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { findExistingFile } from './analyze/existingFile';
import {
  addImportRelation,
  addInheritRelation,
  createSymbol,
} from './analyze/results';

export function addTextSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  name: string,
  rootNode: Parser.SyntaxNode,
): void {
  symbols.push(createSymbol(filePath, kind, name, rootNode));
}

export function addDottedImport(
  relations: IAnalysisRelation[],
  filePath: string,
  sourceRoot: string | null,
  specifier: string,
  extensions: readonly string[],
): string | null {
  const resolvedPath = resolveDottedPath(sourceRoot, specifier, extensions);
  addImportRelation(relations, filePath, specifier, resolvedPath);
  return resolvedPath;
}

export function addLocalImport(
  relations: IAnalysisRelation[],
  filePath: string,
  workspaceRoot: string,
  specifier: string,
  extensions: readonly string[],
): string | null {
  const normalizedSpecifier = specifier.replace(/\\/g, '/');
  const resolvedPath = findExistingFile([
    path.resolve(path.dirname(filePath), normalizedSpecifier),
    path.resolve(workspaceRoot, normalizedSpecifier),
    path.resolve(workspaceRoot, ...normalizedSpecifier.split('/')),
    ...extensions.map(extension =>
      path.resolve(workspaceRoot, ...normalizedSpecifier.split('/')) + extension
    ),
  ]);
  addImportRelation(relations, filePath, specifier, resolvedPath, undefined, 'codegraphy.treesitter:include');
  return resolvedPath;
}

export function resolveDottedPath(
  sourceRoot: string | null,
  specifier: string,
  extensions: readonly string[],
): string | null {
  if (!sourceRoot) {
    return null;
  }

  const basePath = path.join(sourceRoot, ...specifier.split('.'));
  return findExistingFile(extensions.map(extension => `${basePath}${extension}`));
}

export function addInheritByImportedName(
  relations: IAnalysisRelation[],
  filePath: string,
  typeName: string,
  importedPaths: ReadonlyMap<string, string | null>,
): void {
  addInheritRelation(relations, filePath, typeName, importedPaths.get(typeName) ?? null);
}

export function resolveSourceRootFromPackagePath(filePath: string, packageName: string | null): string | null {
  if (!packageName) {
    return path.dirname(filePath);
  }

  let currentPath = path.dirname(filePath);
  for (const segment of packageName.split('.').filter(Boolean).reverse()) {
    if (path.basename(currentPath) !== segment) {
      return null;
    }

    currentPath = path.dirname(currentPath);
  }

  return currentPath;
}
