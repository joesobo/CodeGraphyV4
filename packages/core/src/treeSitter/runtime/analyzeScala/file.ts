import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { addInheritByImportedName, resolveSourceRootFromPackagePath } from '../analyzeTextBaseline';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';
import { addScalaCallRelations } from './calls';
import { addScalaPackageLocalCallables } from './packageCallables';
import { addScalaSymbols } from './symbols';

import { addScalaImports } from './imports';

export function analyzeScalaFile(
  filePath: string,
  tree: Parser.Tree,
  _workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const source = tree.rootNode.text;
  const packageName = source.match(/^\s*package\s+([A-Za-z_][\w.]*)/m)?.[1] ?? null;
  const sourceRoot = resolveSourceRootFromPackagePath(filePath, packageName);
  const importedPaths = new Map<string, string | null>();
  const callableBindings = new Map<string, ImportedBinding>();

  addScalaImports(relations, filePath, source, sourceRoot, importedPaths, callableBindings);

  addScalaPackageLocalCallables(callableBindings, filePath, packageName, sourceRoot);
  addScalaCallRelations(relations, filePath, source, callableBindings);

  for (const match of source.matchAll(/\b(?:class|trait|object|enum)\s+[A-Za-z_]\w*(?:\s*\([^)]*\))?\s+extends\s+([A-Za-z_]\w*)/g)) {
    addInheritByImportedName(relations, filePath, match[1], importedPaths);
  }

  if (shouldIncludeTreeSitterSymbols(options)) {
    addScalaSymbols(symbols, filePath, source, tree.rootNode);
  }

  return normalizeAnalysisResult(filePath, symbols, relations);
}
