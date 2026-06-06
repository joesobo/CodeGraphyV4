import * as fs from 'node:fs';
import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import {
  addInheritRelation,
  addOverrideRelation,
  createSymbolId,
  normalizeAnalysisResult,
} from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleCInclude } from '../analyzeCFamily/includes';
import { handleCFamilySymbol } from '../analyzeCFamily/symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

const CPP_INHERITANCE_PATTERN = /\bclass\s+([A-Za-z_]\w*)\s*:\s*(?:public|protected|private)?\s*([A-Za-z_]\w*)\s*\{/g;
const CPP_OVERRIDE_PATTERN = /\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:const\s*)?override\b/g;
const CPP_TYPE_DECLARATION_PATTERN = /\b(?:class|struct|union)\s+([A-Za-z_]\w*)\b/g;
const CPP_METHOD_DECLARATION_PATTERN = /\b(?:virtual\s+)?(?:[\w:<>~*&]+\s+)+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:const\s*)?(?:=\s*0\s*)?;/g;

function visitCppNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'preproc_include') {
    handleCInclude(node, filePath, workspaceRoot, relations);
    return { skipChildren: true };
  }

  if (!symbolsEnabled) {
    return;
  }

  return handleCFamilySymbol(node, filePath, symbols);
}

export function analyzeCppFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node) =>
    visitCppNode(node, filePath, workspaceRoot, relations, symbols, symbolsEnabled),
  );
  addCppInheritanceRelations(tree.rootNode.text, filePath, relations, symbolsEnabled);
  return normalizeAnalysisResult(filePath, symbols, relations);
}

interface CppIncludedDeclarations {
  fallbackPath: string | null;
  methodPathByName: ReadonlyMap<string, string | null>;
  typePathByName: ReadonlyMap<string, string | null>;
}

function addCppInheritanceRelations(
  source: string,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolsEnabled: boolean,
): void {
  const includedDeclarations = readCppIncludedDeclarations(relations);
  const inheritedTypePaths: Array<string | null> = [];

  for (const match of source.matchAll(CPP_INHERITANCE_PATTERN)) {
    const [, className, baseName] = match;
    const targetPath = resolveCppInheritedTypePath(includedDeclarations, baseName);
    inheritedTypePaths.push(targetPath);
    const classSymbolId = symbolsEnabled ? createSymbolId(filePath, 'class', className) : undefined;
    addInheritRelation(relations, filePath, baseName, targetPath, classSymbolId);
  }

  for (const methodMatch of source.matchAll(CPP_OVERRIDE_PATTERN)) {
    const methodName = methodMatch[1];
    const methodSymbolId = symbolsEnabled ? createSymbolId(filePath, 'method', methodName) : undefined;
    const targetPath = resolveCppOverridePath(includedDeclarations, inheritedTypePaths, methodName);
    addOverrideRelation(relations, filePath, methodName, targetPath, methodSymbolId);
  }
}

function readCppIncludedDeclarations(relations: readonly IAnalysisRelation[]): CppIncludedDeclarations {
  const includedPaths = relations
    .filter((relation) => relation.kind === 'import' && relation.resolvedPath)
    .map((relation) => relation.resolvedPath)
    .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath));
  const typePathByName = new Map<string, string | null>();
  const methodPathByName = new Map<string, string | null>();

  for (const includedPath of includedPaths) {
    const source = readIncludedSource(includedPath);
    if (!source) {
      continue;
    }

    for (const typeName of readCppDeclaredTypeNames(source)) {
      setUniquePath(typePathByName, typeName, includedPath);
    }

    for (const methodName of readCppDeclaredMethodNames(source)) {
      setUniquePath(methodPathByName, methodName, includedPath);
    }
  }

  return {
    fallbackPath: includedPaths.length === 1 ? includedPaths[0] : null,
    methodPathByName,
    typePathByName,
  };
}

function readIncludedSource(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function readCppDeclaredTypeNames(source: string): string[] {
  return Array.from(
    source.matchAll(CPP_TYPE_DECLARATION_PATTERN),
    match => match[1],
  );
}

function readCppDeclaredMethodNames(source: string): string[] {
  return Array.from(
    source.matchAll(CPP_METHOD_DECLARATION_PATTERN),
    match => match[1],
  );
}

function setUniquePath(pathsByName: Map<string, string | null>, name: string, filePath: string): void {
  const existingPath = pathsByName.get(name);
  pathsByName.set(name, existingPath && existingPath !== filePath ? null : filePath);
}

function resolveCppInheritedTypePath(
  includedDeclarations: CppIncludedDeclarations,
  typeName: string,
): string | null {
  const resolvedPath = includedDeclarations.typePathByName.get(typeName);
  return resolvedPath !== undefined ? resolvedPath : includedDeclarations.fallbackPath;
}

function resolveCppOverridePath(
  includedDeclarations: CppIncludedDeclarations,
  inheritedTypePaths: ReadonlyArray<string | null>,
  methodName: string,
): string | null {
  const resolvedPath = includedDeclarations.methodPathByName.get(methodName);
  return resolvedPath !== undefined
    ? resolvedPath
    : inheritedTypePaths.find((inheritedTypePath): inheritedTypePath is string => Boolean(inheritedTypePath))
      ?? includedDeclarations.fallbackPath;
}
