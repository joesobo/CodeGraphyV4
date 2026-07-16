import * as path from 'node:path';
import { addImportRelation } from '../analyze/results';
import { findExistingFile } from '../analyze/existingFile';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';

export interface PascalImports {
  names: Set<string>;
  paths: Map<string, string>;
}

export function collectPascalImports(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  workspaceRoot: string,
): PascalImports {
  const names = new Set<string>();
  const paths = new Map<string, string>();
  for (const match of source.matchAll(/\buses\s+([^;]+);/gi)) {
    addPascalImportList(relations, filePath, workspaceRoot, match[1], names, paths);
  }
  return { names, paths };
}

function addPascalImportList(
  relations: IAnalysisRelation[],
  filePath: string,
  workspaceRoot: string,
  importList: string,
  names: Set<string>,
  paths: Map<string, string>,
): void {
  for (const unitName of importList.split(',').map(unit => unit.trim()).filter(Boolean)) {
    const resolvedPath = resolvePascalUnitPath(filePath, workspaceRoot, unitName);
    addImportRelation(relations, filePath, unitName, resolvedPath);
    names.add(unitName);
    if (resolvedPath) paths.set(unitName, resolvedPath);
  }
}

export function resolvePascalUnitPath(filePath: string, workspaceRoot: string, unitName: string): string | null {
  return findExistingFile([
    path.join(path.dirname(filePath), `${unitName}.pas`),
    path.join(workspaceRoot, `${unitName}.pas`),
    path.join(workspaceRoot, 'src', `${unitName}.pas`),
  ]);
}

export function resolvePascalTypePath(
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
