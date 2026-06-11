import * as fs from 'node:fs';
import CppLanguage from 'tree-sitter-cpp';
import Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { TreeWalkAction } from '../analyze/model';
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
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';
import { handleCppSymbol, type CppSymbolWalkState } from './symbols';

const CPP_TYPE_NODE_TYPES = new Set(['class_specifier', 'struct_specifier', 'union_specifier']);

function visitCppNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  symbolsEnabled: boolean,
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (node.type === 'preproc_include') {
    handleCInclude(node, filePath, workspaceRoot, relations, 'include');
    return { skipChildren: true };
  }

  if (!symbolsEnabled) {
    return;
  }

  return handleCppSymbol(node, filePath, symbols, state);
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
  walkTree<CppSymbolWalkState>(tree.rootNode, {}, (node, state) =>
    visitCppNode(node, filePath, workspaceRoot, relations, symbols, symbolsEnabled, state),
  );
  addCppSemanticRelations(tree.rootNode, filePath, workspaceRoot, relations, symbolsEnabled);
  return normalizeAnalysisResult(filePath, symbols, relations);
}

interface CppIncludedDeclarations {
  functionPathByName: ReadonlyMap<string, string | null>;
  functionSymbolIdByName: ReadonlyMap<string, string>;
  methodCallPathByName: ReadonlyMap<string, string | null>;
  methodSymbolIdByName: ReadonlyMap<string, string>;
  methodPathByName: ReadonlyMap<string, string | null>;
  typePathByName: ReadonlyMap<string, string | null>;
}

interface CppResolvedDeclaration {
  filePath: string;
  symbolId?: string;
}

interface CppOverrideMethod {
  methodName: string;
  sourceSymbolKind: 'class' | 'method';
}

function addCppSemanticRelations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbolsEnabled: boolean,
): void {
  const includedDeclarations = readCppIncludedDeclarations(rootNode, filePath, workspaceRoot, relations);

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

  const target = resolveCppCallTarget(includedDeclarations, calleeName);
  if (!target) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    createCppCallBinding(calleeName, target.filePath),
    symbolsEnabled ? readCppEnclosingFunctionSymbolId(node, filePath) : undefined,
    target.symbolId,
    calleeName,
  );
}

function readCppIncludedDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: readonly IAnalysisRelation[],
): CppIncludedDeclarations {
  const includedPaths = relations
    .filter((relation) => relation.kind === 'include' && relation.resolvedPath)
    .map((relation) => relation.resolvedPath)
    .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath));
  const typePathByName = new Map<string, string | null>();
  const methodPathByName = new Map<string, string | null>();
  const methodCallPathByName = new Map<string, string | null>();
  const functionPathByName = new Map<string, string | null>();
  const functionSymbolIdByName = new Map<string, string>();
  const methodSymbolIdByName = new Map<string, string>();

  collectCppDeclarations(rootNode, filePath, {
    functionPathByName,
    functionSymbolIdByName,
    methodCallPathByName,
    methodSymbolIdByName,
    methodPathByName,
    typePathByName,
  }, { exposeMethodsAsCallTargets: false });

  for (const includedPath of readTransitiveIncludedPaths(includedPaths, workspaceRoot)) {
    const includedRootNode = readIncludedCppRootNode(includedPath);
    if (!includedRootNode) {
      continue;
    }

    collectCppDeclarations(includedRootNode, includedPath, {
      functionPathByName,
      functionSymbolIdByName,
      methodCallPathByName,
      methodSymbolIdByName,
      methodPathByName,
      typePathByName,
    }, { exposeMethodsAsCallTargets: true });
  }

  return {
    functionPathByName,
    functionSymbolIdByName,
    methodCallPathByName,
    methodSymbolIdByName,
    methodPathByName,
    typePathByName,
  };
}

function readTransitiveIncludedPaths(
  includedPaths: readonly string[],
  workspaceRoot: string,
): string[] {
  const visited = new Set<string>();
  const orderedPaths: string[] = [];
  const pending = [...includedPaths];

  while (pending.length > 0) {
    const includedPath = pending.shift();
    if (!includedPath || visited.has(includedPath)) {
      continue;
    }

    visited.add(includedPath);
    orderedPaths.push(includedPath);

    const includedRootNode = readIncludedCppRootNode(includedPath);
    if (!includedRootNode) {
      continue;
    }

    pending.push(...readResolvedCppIncludePaths(includedRootNode, includedPath, workspaceRoot));
  }

  return orderedPaths;
}

function readResolvedCppIncludePaths(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
): string[] {
  const relations: IAnalysisRelation[] = [];
  walkTree(rootNode, {}, (node) => {
    if (node.type === 'preproc_include') {
      handleCInclude(node, filePath, workspaceRoot, relations, 'include');
      return { skipChildren: true };
    }
  });

  return relations
    .map((relation) => relation.resolvedPath)
    .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath));
}

function collectCppDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  declarations: {
    functionPathByName: Map<string, string | null>;
    functionSymbolIdByName: Map<string, string>;
    methodCallPathByName: Map<string, string | null>;
    methodSymbolIdByName: Map<string, string>;
    methodPathByName: Map<string, string | null>;
    typePathByName: Map<string, string | null>;
  },
  options: { exposeMethodsAsCallTargets: boolean },
): void {
  for (const typeName of readCppDeclaredTypeNames(rootNode)) {
    setFirstPath(declarations.typePathByName, typeName, filePath);
  }

  for (const methodName of readCppDeclaredMethodNames(rootNode)) {
    setFirstPath(declarations.methodPathByName, methodName, filePath);
    if (options.exposeMethodsAsCallTargets) {
      setFirstPath(declarations.methodCallPathByName, methodName, filePath);
    }
  }

  for (const method of readCppDeclaredMethodSymbols(rootNode)) {
    setFirstSymbolId(
      declarations.methodSymbolIdByName,
      method.methodName,
      createSymbolId(filePath, 'method', method.symbolName),
    );
  }

  for (const functionName of readCppDeclaredFunctionNames(rootNode)) {
    setFirstPath(declarations.functionPathByName, functionName, filePath);
  }

  for (const functionName of readCppDefinedFunctionNames(rootNode)) {
    setFirstSymbolId(
      declarations.functionSymbolIdByName,
      functionName,
      createSymbolId(filePath, 'function', functionName),
    );
  }
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

  for (const method of readCppOverrideMethods(node)) {
    const sourceSymbolId = symbolsEnabled && typeName
      ? createSymbolId(
          filePath,
          method.sourceSymbolKind,
          method.sourceSymbolKind === 'method' ? `${typeName}::${method.methodName}` : typeName,
        )
      : undefined;
    const targetPath = resolveCppOverridePath(includedDeclarations, inheritedTypePaths, method.methodName);
    const targetSymbolId = resolveCppOverrideSymbolId(includedDeclarations, targetPath, method.methodName);
    addOverrideRelation(
      relations,
      filePath,
      method.methodName,
      targetPath,
      sourceSymbolId,
      targetSymbolId,
    );
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
      if (!isInsideClassLike(node) && !readQualifiedCppFunctionName(node)) {
        return;
      }

      const methodName = readCppDeclaratorName(node);
      if (methodName) {
        names.push(methodName);
      }
    }
  });
  return names;
}

function readCppDeclaredMethodSymbols(rootNode: Parser.SyntaxNode): Array<{
  methodName: string;
  symbolName: string;
}> {
  const methods: Array<{ methodName: string; symbolName: string }> = [];
  walkTree(rootNode, {}, (node) => collectCppDeclaredMethodSymbol(node, methods));
  return methods;
}

function collectCppDeclaredMethodSymbol(
  node: Parser.SyntaxNode,
  methods: Array<{ methodName: string; symbolName: string }>,
): TreeWalkAction<unknown> | void {
  const method = readCppDefinedMethodSymbol(node) ?? readCppPureVirtualMethodSymbol(node);
  if (!method) {
    return;
  }

  methods.push(method);
  return { skipChildren: true };
}

function readCppDefinedMethodSymbol(
  node: Parser.SyntaxNode,
): { methodName: string; symbolName: string } | null {
  if (node.type !== 'function_definition' || !isCppMethodDefinition(node)) {
    return null;
  }

  return createCppMethodSymbol(
    readCppDeclaratorName(node.childForFieldName('declarator') ?? undefined),
    readCppFunctionSymbolName(node),
  );
}

function readCppPureVirtualMethodSymbol(
  node: Parser.SyntaxNode,
): { methodName: string; symbolName: string } | null {
  if (node.type !== 'field_declaration' || !isPureVirtualDeclaration(node)) {
    return null;
  }

  const methodName = readCppDeclaratorName(node);
  const className = readContainingCppTypeName(node);
  return methodName && className
    ? createCppMethodSymbol(methodName, `${className}::${methodName}`)
    : null;
}

function createCppMethodSymbol(
  methodName: string | null,
  symbolName: string | null,
): { methodName: string; symbolName: string } | null {
  return methodName && symbolName ? { methodName, symbolName } : null;
}

function readCppDeclaredFunctionNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (node.type !== 'function_declarator') {
      return;
    }

    if (isInsideClassLike(node) || readQualifiedCppFunctionName(node)) {
      return;
    }

    const functionName = readCppDeclaratorName(node);
    if (functionName) {
      names.push(functionName);
    }
  });
  return names;
}

function readCppDefinedFunctionNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (node.type !== 'function_definition' || isCppMethodDefinition(node)) {
      return;
    }

    const functionName = readCppFunctionSymbolName(node);
    if (functionName) {
      names.push(functionName);
    }
    return { skipChildren: true };
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

function readCppOverrideMethods(typeNode: Parser.SyntaxNode): CppOverrideMethod[] {
  const methods: CppOverrideMethod[] = [];
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
      methods.push({
        methodName,
        sourceSymbolKind: isInsideFunctionDefinition(node) ? 'method' : 'class',
      });
    }
  });
  return methods;
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
      const functionName = readCppFunctionSymbolName(current);
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

  return Boolean(readQualifiedCppFunctionName(functionDefinition.childForFieldName('declarator') ?? undefined));
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

  if (isCppDeclaratorIdentifier(node)) {
    return node.text;
  }

  return readQualifiedCppDeclaratorName(node) ?? readNestedCppDeclaratorName(node);
}

function isCppDeclaratorIdentifier(node: Parser.SyntaxNode): boolean {
  return node.type === 'field_identifier' || node.type === 'identifier';
}

function readQualifiedCppDeclaratorName(node: Parser.SyntaxNode): string | null {
  if (node.type !== 'qualified_identifier') {
    return null;
  }

  return readCppDeclaratorName(node.namedChildren.at(-1));
}

function readNestedCppDeclaratorName(node: Parser.SyntaxNode): string | null {
  const declarator = node.childForFieldName('declarator');
  if (declarator) {
    return readCppDeclaratorName(declarator);
  }

  return readFirstCppDeclaratorName(node.namedChildren);
}

function readFirstCppDeclaratorName(nodes: ReadonlyArray<Parser.SyntaxNode>): string | null {
  return nodes.reduce<string | null>((name, child) => name ?? readCppDeclaratorName(child), null);
}

function readCppFunctionSymbolName(functionDefinition: Parser.SyntaxNode): string | null {
  return readQualifiedCppFunctionName(functionDefinition.childForFieldName('declarator') ?? undefined)
    ?? readCppDeclaratorName(functionDefinition.childForFieldName('declarator') ?? undefined);
}

function readQualifiedCppFunctionName(node: Parser.SyntaxNode | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node.type === 'qualified_identifier') {
    return node.text;
  }

  const declarator = node.childForFieldName('declarator');
  return declarator
    ? readQualifiedCppFunctionName(declarator)
    : node.namedChildren.map(readQualifiedCppFunctionName).find(Boolean) ?? null;
}

function isInsideClassLike(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (CPP_TYPE_NODE_TYPES.has(current.type)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function readContainingCppTypeName(node: Parser.SyntaxNode): string | null {
  let current = node.parent;

  while (current) {
    if (CPP_TYPE_NODE_TYPES.has(current.type)) {
      return current.childForFieldName('name')?.text ?? null;
    }

    current = current.parent;
  }

  return null;
}

function isInsideFunctionDefinition(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (current.type === 'function_definition') {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isPureVirtualDeclaration(node: Parser.SyntaxNode): boolean {
  return /=\s*0\s*;?$/.test(node.text.trim());
}

function setFirstPath(pathsByName: Map<string, string | null>, name: string, filePath: string): void {
  if (!pathsByName.has(name)) {
    pathsByName.set(name, filePath);
  }
}

function setFirstSymbolId(symbolIdsByName: Map<string, string>, name: string, symbolId: string): void {
  if (!symbolIdsByName.has(name)) {
    symbolIdsByName.set(name, symbolId);
  }
}

function resolveCppDeclarationTarget(
  pathByName: ReadonlyMap<string, string | null>,
  symbolIdByName: ReadonlyMap<string, string>,
  name: string,
): CppResolvedDeclaration | null {
  const filePath = pathByName.get(name);
  if (!filePath) {
    return null;
  }

  const symbolId = symbolIdByName.get(name);
  return {
    filePath,
    ...(symbolId?.startsWith(`${filePath}:`) ? { symbolId } : {}),
  };
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

function resolveCppOverrideSymbolId(
  includedDeclarations: CppIncludedDeclarations,
  targetPath: string | null,
  methodName: string,
): string | undefined {
  if (!targetPath) {
    return undefined;
  }

  const symbolId = includedDeclarations.methodSymbolIdByName.get(methodName);
  return symbolId?.startsWith(`${targetPath}:`) ? symbolId : undefined;
}

function resolveCppCallTarget(
  includedDeclarations: CppIncludedDeclarations,
  calleeName: string,
): CppResolvedDeclaration | null {
  const functionTarget = resolveCppDeclarationTarget(
    includedDeclarations.functionPathByName,
    includedDeclarations.functionSymbolIdByName,
    calleeName,
  );
  if (functionTarget) {
    return functionTarget;
  }

  const methodTarget = resolveCppDeclarationTarget(
    includedDeclarations.methodCallPathByName,
    includedDeclarations.methodSymbolIdByName,
    calleeName,
  );
  if (methodTarget) {
    return methodTarget;
  }

  const typePath = includedDeclarations.typePathByName.get(calleeName);
  return typePath ? { filePath: typePath } : null;
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
