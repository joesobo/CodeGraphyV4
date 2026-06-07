import * as fs from 'node:fs';
import CppLanguage from 'tree-sitter-cpp';
import Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import {
  addCallRelation,
  addInheritRelation,
  addOverrideRelation,
  createSymbolId,
  normalizeAnalysisResult,
} from '../analyze/results';
import { walkTree } from '../analyze/walk';
import type { ImportedBinding } from '../analyze/model';
import { handleCInclude } from '../analyzeCFamily/includes';
import { handleCFamilySymbol } from '../analyzeCFamily/symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

const CPP_TYPE_NODE_TYPES = new Set(['class_specifier', 'struct_specifier', 'union_specifier']);

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
  addCppSemanticRelations(tree.rootNode, filePath, relations, symbolsEnabled);
  return normalizeAnalysisResult(filePath, symbols, relations);
}

interface CppIncludedDeclarations {
  methodPathByName: ReadonlyMap<string, string | null>;
  typePathByName: ReadonlyMap<string, string | null>;
}

function addCppSemanticRelations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolsEnabled: boolean,
): void {
  const includedDeclarations = readCppIncludedDeclarations(relations);

  walkTree(rootNode, {}, (node) => {
    if (node.type === 'call_expression') {
      addCppCallRelation(node, filePath, relations, includedDeclarations, symbolsEnabled);
      return;
    }

    if (!CPP_TYPE_NODE_TYPES.has(node.type)) {
      return;
    }

    addCppTypeRelations(node, filePath, relations, includedDeclarations, symbolsEnabled);
    return { skipChildren: true };
  });
}

function addCppCallRelation(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  includedDeclarations: CppIncludedDeclarations,
  symbolsEnabled: boolean,
): void {
  const calleeName = readCppCallName(node);
  if (!calleeName) {
    return;
  }

  const targetPath = resolveCppCallPath(includedDeclarations, calleeName);
  if (!targetPath) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    createCppCallBinding(calleeName, targetPath),
    symbolsEnabled ? readCppEnclosingFunctionSymbolId(node, filePath) : undefined,
  );
}

function readCppIncludedDeclarations(relations: readonly IAnalysisRelation[]): CppIncludedDeclarations {
  const includedPaths = relations
    .filter((relation) => relation.kind === 'import' && relation.resolvedPath)
    .map((relation) => relation.resolvedPath)
    .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath));
  const typePathByName = new Map<string, string | null>();
  const methodPathByName = new Map<string, string | null>();

  for (const includedPath of includedPaths) {
    const includedRootNode = readIncludedCppRootNode(includedPath);
    if (!includedRootNode) {
      continue;
    }

    for (const typeName of readCppDeclaredTypeNames(includedRootNode)) {
      setUniquePath(typePathByName, typeName, includedPath);
    }

    for (const methodName of readCppDeclaredMethodNames(includedRootNode)) {
      setUniquePath(methodPathByName, methodName, includedPath);
    }
  }

  return {
    methodPathByName,
    typePathByName,
  };
}

function readIncludedCppRootNode(filePath: string): Parser.SyntaxNode | null {
  try {
    const parser = new Parser();
    parser.setLanguage(CppLanguage as unknown as Parser.Language);
    return parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
  } catch {
    return null;
  }
}

function addCppTypeRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  includedDeclarations: CppIncludedDeclarations,
  symbolsEnabled: boolean,
): void {
  const typeName = node.childForFieldName('name')?.text;
  const typeKind = readCppTypeKind(node);
  const inheritedTypePaths = readCppBaseTypeNames(node).map((baseName) => {
    const targetPath = resolveCppInheritedTypePath(includedDeclarations, baseName);
    const typeSymbolId = symbolsEnabled && typeName
      ? createSymbolId(filePath, typeKind, typeName)
      : undefined;
    addInheritRelation(relations, filePath, baseName, targetPath, typeSymbolId);
    return targetPath;
  });

  for (const methodName of readCppOverrideMethodNames(node)) {
    const methodSymbolId = symbolsEnabled ? createSymbolId(filePath, 'method', methodName) : undefined;
    const targetPath = resolveCppOverridePath(includedDeclarations, inheritedTypePaths, methodName);
    addOverrideRelation(relations, filePath, methodName, targetPath, methodSymbolId);
  }
}

function readCppTypeKind(node: Parser.SyntaxNode): 'class' | 'struct' | 'union' {
  if (node.type === 'union_specifier') {
    return 'union';
  }

  return node.type === 'struct_specifier' ? 'struct' : 'class';
}

function readCppDeclaredTypeNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (CPP_TYPE_NODE_TYPES.has(node.type)) {
      const typeName = node.childForFieldName('name')?.text;
      if (typeName) {
        names.push(typeName);
      }
    }
  });
  return names;
}

function readCppDeclaredMethodNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (node.type === 'function_declarator') {
      const methodName = readCppDeclaratorName(node);
      if (methodName) {
        names.push(methodName);
      }
    }
  });
  return names;
}

function readCppBaseTypeNames(typeNode: Parser.SyntaxNode): string[] {
  const baseClause = typeNode.namedChildren.find((child) => child.type === 'base_class_clause');
  if (!baseClause) {
    return [];
  }

  return baseClause.namedChildren
    .filter((child) => child.type !== 'access_specifier')
    .map(readCppTypeName)
    .filter((typeName): typeName is string => Boolean(typeName));
}

function readCppOverrideMethodNames(typeNode: Parser.SyntaxNode): string[] {
  const methodNames: string[] = [];
  walkTree(typeNode, {}, (node) => {
    if (node.type !== 'function_declarator') {
      return;
    }

    if (!node.namedChildren.some((child) =>
      child.type === 'virtual_specifier' && child.text === 'override'
    )) {
      return;
    }

    const methodName = readCppDeclaratorName(node);
    if (methodName) {
      methodNames.push(methodName);
    }
  });
  return methodNames;
}

function readCppCallName(callExpression: Parser.SyntaxNode): string | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  if (!calleeNode) {
    return null;
  }

  if (calleeNode.type === 'field_expression') {
    return readCppDeclaratorName(
      calleeNode.childForFieldName('field')
        ?? calleeNode.namedChildren.find((child) => child.type === 'field_identifier'),
    );
  }

  return readCppDeclaratorName(calleeNode) ?? readCppTypeName(calleeNode);
}

function readCppEnclosingFunctionSymbolId(node: Parser.SyntaxNode, filePath: string): string | undefined {
  let current: Parser.SyntaxNode | null = node.parent;
  while (current) {
    if (current.type === 'function_definition') {
      const functionName = readCppDeclaratorName(current.childForFieldName('declarator') ?? undefined);
      if (!functionName) {
        return undefined;
      }

      const symbolKind = isCppMethodDefinition(current) ? 'method' : 'function';
      return createSymbolId(filePath, symbolKind, functionName);
    }

    current = current.parent;
  }

  return undefined;
}

function isCppMethodDefinition(functionDefinition: Parser.SyntaxNode): boolean {
  if (functionDefinition.parent && CPP_TYPE_NODE_TYPES.has(functionDefinition.parent.type)) {
    return true;
  }

  const declaratorName = functionDefinition.childForFieldName('declarator')?.text ?? '';
  return declaratorName.includes('::');
}

function readCppTypeName(node: Parser.SyntaxNode): string | null {
  if (node.type === 'template_type') {
    return readCppTypeName(node.childForFieldName('name') ?? node.namedChildren[0]);
  }

  if (node.type === 'qualified_identifier') {
    const unqualifiedName = node.namedChildren.at(-1);
    return unqualifiedName ? readCppTypeName(unqualifiedName) : null;
  }

  return node.type.endsWith('identifier') ? node.text : null;
}

function readCppDeclaratorName(node: Parser.SyntaxNode | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node.type === 'field_identifier' || node.type === 'identifier') {
    return node.text;
  }

  return node.childForFieldName('declarator')
    ? readCppDeclaratorName(node.childForFieldName('declarator') ?? undefined)
    : node.namedChildren.map(readCppDeclaratorName).find(Boolean) ?? null;
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
  return resolvedPath ?? null;
}

function resolveCppOverridePath(
  includedDeclarations: CppIncludedDeclarations,
  inheritedTypePaths: ReadonlyArray<string | null>,
  methodName: string,
): string | null {
  const resolvedPath = includedDeclarations.methodPathByName.get(methodName);
  const inheritedPathSet = new Set(
    inheritedTypePaths.filter((inheritedTypePath): inheritedTypePath is string => Boolean(inheritedTypePath)),
  );

  if (resolvedPath && inheritedPathSet.has(resolvedPath)) {
    return resolvedPath;
  }

  return inheritedTypePaths.find((inheritedTypePath): inheritedTypePath is string => Boolean(inheritedTypePath))
    ?? null;
}

function resolveCppCallPath(
  includedDeclarations: CppIncludedDeclarations,
  calleeName: string,
): string | null {
  const methodPath = includedDeclarations.methodPathByName.get(calleeName);
  if (methodPath) {
    return methodPath;
  }

  const typePath = includedDeclarations.typePathByName.get(calleeName);
  return typePath ?? null;
}

function createCppCallBinding(calleeName: string, targetPath: string): ImportedBinding {
  return {
    specifier: calleeName,
    resolvedPath: targetPath,
    bindingKind: 'named',
    importedName: calleeName,
    localName: calleeName,
    memberName: calleeName,
  };
}
