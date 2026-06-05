import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { normalizeAnalysisResult } from '../analyze/results';
import {
  addDottedImport,
  addInheritByImportedName,
  addTextSymbol,
  resolveSourceRootFromPackagePath,
} from '../analyzeTextBaseline';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

const SCALA_EXTENSIONS = ['.scala'] as const;

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

  for (const match of source.matchAll(/^\s*import\s+([A-Za-z_][\w.]*)(?:\s*\{[^}]*\})?/gm)) {
    const specifier = match[1];
    const resolvedPath = addDottedImport(relations, filePath, sourceRoot, specifier, SCALA_EXTENSIONS);
    importedPaths.set(specifier.split('.').at(-1) ?? specifier, resolvedPath);
  }

  for (const match of source.matchAll(/\b(?:class|trait|object|enum)\s+[A-Za-z_]\w*(?:\s*\([^)]*\))?\s+extends\s+([A-Za-z_]\w*)/g)) {
    addInheritByImportedName(relations, filePath, match[1], importedPaths);
  }

  if (shouldIncludeTreeSitterSymbols(options)) {
    for (const match of source.matchAll(/\b(class|trait|object|enum)\s+([A-Za-z_]\w*)/g)) {
      const kind = match[1] === 'trait' ? 'interface' : match[1];
      addTextSymbol(symbols, filePath, kind, match[2], tree.rootNode);
    }

    for (const match of source.matchAll(/\bdef\s+([A-Za-z_]\w*)/g)) {
      addTextSymbol(symbols, filePath, 'method', match[1], tree.rootNode);
    }

    for (const match of source.matchAll(/\btype\s+([A-Za-z_]\w*)\s*=/g)) {
      addTextSymbol(symbols, filePath, 'type', match[1], tree.rootNode);
    }
  }

  return normalizeAnalysisResult(filePath, symbols, relations);
}
