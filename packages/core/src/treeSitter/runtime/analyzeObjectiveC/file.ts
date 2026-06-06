import * as path from 'node:path';
import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { addInheritRelation, normalizeAnalysisResult } from '../analyze/results';
import {
  addLocalImport,
  addTextSymbol,
} from '../analyzeTextBaseline';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

export function analyzeObjectiveCFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const source = tree.rootNode.text;

  for (const match of source.matchAll(/^\s*#\s*import\s+(?:"([^"]+)"|<([^>]+)>)/gm)) {
    const specifier = match[1] ?? match[2];
    if (!specifier || specifier.includes('/usr/include') || specifier.startsWith('Foundation/')) {
      continue;
    }

    addLocalImport(
      relations,
      filePath,
      path.dirname(path.dirname(filePath)).startsWith(workspaceRoot) ? workspaceRoot : path.dirname(filePath),
      specifier,
      ['.h', '.m', '.mm'],
    );
  }

  for (const match of source.matchAll(/^\s*@interface\s+([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)(?:\s*<([^>]+)>)?/gm)) {
    const className = match[1];
    const inheritedNames = [
      match[2],
      ...(match[3]?.split(',').map(name => name.trim()).filter(Boolean) ?? []),
    ];
    const fromSymbolId = shouldIncludeTreeSitterSymbols(options)
      ? `${filePath}:class:${className}`
      : undefined;

    for (const typeName of inheritedNames) {
      addInheritRelation(
        relations,
        filePath,
        typeName,
        resolveObjectiveCImportPathForType(relations, typeName),
        fromSymbolId,
      );
    }
  }

  if (shouldIncludeTreeSitterSymbols(options)) {
    for (const match of source.matchAll(/^\s*@(interface|protocol|implementation)\s+([A-Za-z_]\w*)/gm)) {
      const kind = match[1] === 'protocol' ? 'protocol' : 'class';
      addTextSymbol(symbols, filePath, kind, match[2], tree.rootNode);
    }

    for (const match of source.matchAll(/^\s*[-+]\s*\([^)]*\)\s*([A-Za-z_]\w*)/gm)) {
      addTextSymbol(symbols, filePath, 'method', match[1], tree.rootNode);
    }
  }

  return normalizeAnalysisResult(filePath, symbols, relations);
}

function resolveObjectiveCImportPathForType(
  relations: readonly IAnalysisRelation[],
  typeName: string,
): string | null {
  return relations.find((relation) =>
    relation.kind === 'import'
    && relation.resolvedPath
    && relation.specifier?.split('/').pop()?.replace(/\.[hm]+$/, '') === typeName
  )?.resolvedPath ?? null;
}
