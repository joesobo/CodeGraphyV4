import * as fs from 'node:fs';
import * as path from 'node:path';
import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addCallRelation, normalizeAnalysisResult } from '../analyze/results';
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
  const callableBindings = new Map<string, ImportedBinding>();

  for (const match of source.matchAll(/^\s*import\s+([A-Za-z_][\w.]*)(?:\s*\{[^}]*\})?/gm)) {
    const specifier = match[1];
    const resolvedPath = addDottedImport(relations, filePath, sourceRoot, specifier, SCALA_EXTENSIONS);
    const importedName = specifier.split('.').at(-1) ?? specifier;
    importedPaths.set(importedName, resolvedPath);
    if (resolvedPath) {
      callableBindings.set(importedName, {
        importedName,
        specifier: importedName,
        resolvedPath,
      });
    }
  }

  addScalaPackageLocalCallables(callableBindings, filePath, packageName, sourceRoot);
  addScalaCallRelations(relations, filePath, source, callableBindings);

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

function addScalaPackageLocalCallables(
  callableBindings: Map<string, ImportedBinding>,
  filePath: string,
  packageName: string | null,
  sourceRoot: string | null,
): void {
  if (!packageName || !sourceRoot) {
    return;
  }

  const packagePath = path.join(sourceRoot, ...packageName.split('.'));
  let entries: string[];
  try {
    entries = fs.readdirSync(packagePath);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.scala')) {
      continue;
    }

    const candidatePath = path.join(packagePath, entry);
    if (candidatePath === filePath) {
      continue;
    }

    for (const name of readScalaDeclaredNames(candidatePath)) {
      callableBindings.set(name, {
        importedName: name,
        specifier: name,
        resolvedPath: candidatePath,
      });
    }
  }
}

function addScalaCallRelations(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  callableBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  const receiverTypeNames = collectScalaReceiverTypeNames(source);
  const seen = new Set<string>();

  for (const match of source.matchAll(/\b([A-Z][A-Za-z_]\w*)\s*(?:\.|\()/g)) {
    addScalaCallRelationForBinding(relations, filePath, callableBindings.get(match[1]), seen);
  }

  for (const match of source.matchAll(/\b([a-z][A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\b/g)) {
    const typeName = receiverTypeNames.get(match[1]);
    if (typeName) {
      addScalaCallRelationForBinding(relations, filePath, callableBindings.get(typeName), seen);
    }
  }
}

function collectScalaReceiverTypeNames(source: string): Map<string, string> {
  const receiverTypeNames = new Map<string, string>();

  for (const match of source.matchAll(/\b(?:val|var)?\s*([a-z][A-Za-z_]\w*)\s*:\s*([A-Z][A-Za-z_]\w*)\b/g)) {
    receiverTypeNames.set(match[1], match[2]);
  }

  return receiverTypeNames;
}

function addScalaCallRelationForBinding(
  relations: IAnalysisRelation[],
  filePath: string,
  binding: ImportedBinding | undefined,
  seen: Set<string>,
): void {
  if (!binding?.resolvedPath || binding.resolvedPath === filePath || seen.has(binding.resolvedPath)) {
    return;
  }

  seen.add(binding.resolvedPath);
  addCallRelation(relations, filePath, binding);
}

function readScalaDeclaredNames(filePath: string): string[] {
  try {
    const source = fs.readFileSync(filePath, 'utf8');
    return [...source.matchAll(/\b(?:class|trait|object|enum|case\s+class)\s+([A-Z][A-Za-z_]\w*)/g)]
      .map(match => match[1]);
  } catch {
    return [];
  }
}
