import * as path from 'node:path';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IAnalysisRange,
} from '@codegraphy-dev/plugin-api';
import { findExistingFile } from '../analyze/existingFile';
import {
  addImportRelation,
  addInheritRelation,
  normalizeAnalysisResult,
} from '../analyze/results';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

export function analyzePascalTextFile(
  filePath: string,
  source: string,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const importedUnits = new Set<string>();

  for (const match of source.matchAll(/\buses\s+([^;]+);/gi)) {
    for (const unitName of match[1].split(',').map(unit => unit.trim()).filter(Boolean)) {
      const resolvedPath = resolvePascalUnitPath(filePath, workspaceRoot, unitName);
      addImportRelation(relations, filePath, unitName, resolvedPath);
      importedUnits.add(unitName);
    }
  }

  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*=\s*class\s*\(\s*([A-Za-z_]\w*)\s*\)/gi)) {
    addInheritRelation(relations, filePath, match[2], resolvePascalTypePath(filePath, workspaceRoot, match[2], importedUnits));
  }

  if (shouldIncludeTreeSitterSymbols(options)) {
    for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*=\s*(class|record|interface)\b/gi)) {
      const kind = match[2].toLowerCase() === 'record' ? 'struct' : match[2].toLowerCase();
      addPascalSymbol(symbols, filePath, kind, match[1]);
    }

    for (const match of source.matchAll(/\b(?:procedure|function)\s+(?:[A-Za-z_]\w*\.)?([A-Za-z_]\w*)/gi)) {
      addPascalSymbol(symbols, filePath, 'method', match[1]);
    }
  }

  return normalizeAnalysisResult(filePath, symbols, relations);
}

function addPascalSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  name: string,
): void {
  const range: IAnalysisRange = {
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 1,
  };

  symbols.push({
    id: `${filePath}:${kind}:${name}`,
    filePath,
    kind,
    name,
    range,
  });
}

function resolvePascalUnitPath(filePath: string, workspaceRoot: string, unitName: string): string | null {
  return findExistingFile([
    path.join(path.dirname(filePath), `${unitName}.pas`),
    path.join(workspaceRoot, `${unitName}.pas`),
    path.join(workspaceRoot, 'src', `${unitName}.pas`),
  ]);
}

function resolvePascalTypePath(
  filePath: string,
  workspaceRoot: string,
  typeName: string,
  importedUnits: ReadonlySet<string>,
): string | null {
  const unitName = typeName.replace(/^T/, '');
  return resolvePascalUnitPath(filePath, workspaceRoot, unitName)
    ?? [...importedUnits]
      .map(importedUnit => resolvePascalUnitPath(filePath, workspaceRoot, importedUnit))
      .find((candidate): candidate is string => Boolean(candidate))
    ?? null;
}
