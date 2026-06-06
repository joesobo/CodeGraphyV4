import * as path from 'node:path';
import * as fs from 'node:fs';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IAnalysisRange,
} from '@codegraphy-dev/plugin-api';
import { findExistingFile } from '../analyze/existingFile';
import {
  addCallRelation,
  addImportRelation,
  addInheritRelation,
  addOverrideRelation,
  normalizeAnalysisResult,
} from '../analyze/results';
import type { ImportedBinding } from '../analyze/model';
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
  const importedUnitPaths = new Map<string, string>();

  for (const match of source.matchAll(/\buses\s+([^;]+);/gi)) {
    for (const unitName of match[1].split(',').map(unit => unit.trim()).filter(Boolean)) {
      const resolvedPath = resolvePascalUnitPath(filePath, workspaceRoot, unitName);
      addImportRelation(relations, filePath, unitName, resolvedPath);
      importedUnits.add(unitName);
      if (resolvedPath) {
        importedUnitPaths.set(unitName, resolvedPath);
      }
    }
  }

  addPascalCallRelations(relations, filePath, source, importedUnitPaths);

  const basePathByClassName = new Map<string, string | null>();

  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*=\s*class\s*\(\s*([A-Za-z_]\w*)\s*\)/gi)) {
    const resolvedPath = resolvePascalTypePath(filePath, workspaceRoot, match[2], importedUnits);
    basePathByClassName.set(match[1], resolvedPath);
    addInheritRelation(relations, filePath, match[2], resolvedPath);
  }

  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*=\s*class\s*\([^)]*\)([\s\S]*?)\bend\s*;/gi)) {
    const className = match[1];
    const resolvedPath = basePathByClassName.get(className) ?? null;
    for (const methodMatch of match[2].matchAll(/\b(?:procedure|function)\s+([A-Za-z_]\w*)\b[^\n]*\boverride\b/gi)) {
      addOverrideRelation(
        relations,
        filePath,
        methodMatch[1],
        resolvedPath,
        `${filePath}:method:${methodMatch[1]}`,
      );
    }
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

function addPascalCallRelations(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  importedUnitPaths: ReadonlyMap<string, string>,
): void {
  const typeUnitPaths = createPascalTypeUnitPathMap(importedUnitPaths);
  const receiverTypeNames = collectPascalReceiverTypeNames(source);
  const seen = new Set<string>();

  for (const match of source.matchAll(/\b(T[A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\b/g)) {
    addPascalCallRelationForType(relations, filePath, match[1], typeUnitPaths, seen);
  }

  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\b/g)) {
    const receiverTypeName = receiverTypeNames.get(match[1]);
    if (receiverTypeName) {
      addPascalCallRelationForType(relations, filePath, receiverTypeName, typeUnitPaths, seen);
    }
  }
}

function createPascalTypeUnitPathMap(importedUnitPaths: ReadonlyMap<string, string>): Map<string, ImportedBinding> {
  const typeUnitPaths = new Map<string, ImportedBinding>();
  for (const [unitName, resolvedPath] of importedUnitPaths) {
    typeUnitPaths.set(`T${unitName}`, {
      importedName: unitName,
      specifier: unitName,
      resolvedPath,
    });
    for (const typeName of readPascalDeclaredTypeNames(resolvedPath)) {
      typeUnitPaths.set(typeName, {
        importedName: unitName,
        specifier: unitName,
        resolvedPath,
      });
    }
  }

  return typeUnitPaths;
}

function readPascalDeclaredTypeNames(filePath: string): string[] {
  try {
    const source = fs.readFileSync(filePath, 'utf8');
    return [...source.matchAll(/\b(T[A-Za-z_]\w*)\s*=/g)].map(match => match[1]);
  } catch {
    return [];
  }
}

function collectPascalReceiverTypeNames(source: string): Map<string, string> {
  const receiverTypeNames = new Map<string, string>();

  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*:\s*(T[A-Za-z_]\w*)\b/g)) {
    receiverTypeNames.set(match[1], match[2]);
  }

  return receiverTypeNames;
}

function addPascalCallRelationForType(
  relations: IAnalysisRelation[],
  filePath: string,
  typeName: string,
  typeUnitPaths: ReadonlyMap<string, ImportedBinding>,
  seen: Set<string>,
): void {
  const binding = typeUnitPaths.get(typeName);
  if (!binding?.resolvedPath || seen.has(binding.resolvedPath)) {
    return;
  }

  seen.add(binding.resolvedPath);
  addCallRelation(relations, filePath, binding);
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
