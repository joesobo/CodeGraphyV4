import * as fs from 'node:fs';
import DartLanguage from '@driftlog/tree-sitter-dart';
import Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addCallRelation, addReferenceRelation, normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleDartLibraryImport } from './imports';
import {
  handleDartClassDefinition,
  handleDartConstantDeclaration,
  handleDartFunctionSignature,
  handleDartLocalDeclaration,
  handleDartTypeDeclaration,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitDartNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedSymbolPaths: Map<string, string | null>,
  importedSymbolKinds: Map<string, string>,
  localValueReturningMethods: Set<string>,
  pendingSymbolContext: { value: { id?: string; kind: string } | undefined },
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'library_import') {
    handleDartLibraryImport(node, filePath, workspaceRoot, relations);
    const importRelation = relations.at(-1);
    if (importRelation?.kind === 'import') {
      const typeName = toDartTypeName(importRelation.specifier ?? '');
      if (typeName) {
        importedSymbolPaths.set(typeName, importRelation.resolvedPath ?? null);
      }
      if (importRelation.resolvedPath) {
        for (const symbol of readDartSymbols(importRelation.resolvedPath)) {
          importedSymbolPaths.set(symbol.name, importRelation.resolvedPath);
          importedSymbolKinds.set(symbol.name, symbol.kind);
        }
      }
    }
    return { skipChildren: true };
  }

  if (node.type === 'class_definition') {
    registerDartLocalType(node, filePath, 'class', importedSymbolPaths, importedSymbolKinds);
    handleDartClassDefinition(node, filePath, relations, symbols, symbolsEnabled, importedSymbolPaths);
    return;
  }

  if (
    node.type === 'mixin_declaration'
    || node.type === 'enum_declaration'
    || node.type === 'type_alias'
    || node.type === 'extension_declaration'
  ) {
    registerDartLocalType(node, filePath, getDartTypeDeclarationKind(node), importedSymbolPaths, importedSymbolKinds);
    addDartTypeDeclarationReferenceRelations(node, filePath, relations, importedSymbolPaths, state.currentSymbolId);
    if (!symbolsEnabled) {
      return;
    }
    handleDartTypeDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'static_final_declaration_list') {
    if (symbolsEnabled) {
      handleDartConstantDeclaration(node, filePath, symbols);
    }
  }

  if (node.type === 'declaration' || node.type === 'initialized_identifier') {
    handleDartAliasTypeReference(node, filePath, relations, importedSymbolPaths, importedSymbolKinds, state.currentSymbolId);
  }

  if (node.type === 'type_identifier') {
    handleDartAliasTypeIdentifierReference(
      node,
      filePath,
      relations,
      importedSymbolPaths,
      importedSymbolKinds,
      state.currentSymbolId,
    );
  }

  if (node.type === 'method_signature') {
    const targetSymbols = symbolsEnabled ? symbols : [];
    const previousSymbolCount = targetSymbols.length;
    const action = handleDartFunctionSignature(node, filePath, targetSymbols);
    const symbolId = symbolsEnabled && targetSymbols.length > previousSymbolCount ? targetSymbols.at(-1)?.id : undefined;
    registerDartValueReturningMethod(node, filePath, importedSymbolPaths, importedSymbolKinds, localValueReturningMethods);
    pendingSymbolContext.value = { id: symbolId, kind: 'method' };
    addDartSignatureReferenceRelations(node, filePath, relations, importedSymbolPaths, symbolId);
    return action;
  }

  if (node.type === 'function_signature' && node.parent?.type !== 'method_signature') {
    const targetSymbols = symbolsEnabled ? symbols : [];
    const previousSymbolCount = targetSymbols.length;
    const action = handleDartFunctionSignature(node, filePath, targetSymbols);
    const symbolId = symbolsEnabled && targetSymbols.length > previousSymbolCount ? targetSymbols.at(-1)?.id : undefined;
    pendingSymbolContext.value = { id: symbolId, kind: 'function' };
    addDartSignatureReferenceRelations(node, filePath, relations, importedSymbolPaths, symbolId);
    return action;
  }

  if (node.type === 'local_variable_declaration') {
    if (symbolsEnabled) {
      handleDartLocalDeclaration(node, filePath, symbols);
    }
  }

  if (node.type === 'function_body' && pendingSymbolContext.value) {
    const currentSymbol = pendingSymbolContext.value;
    pendingSymbolContext.value = undefined;
    return {
      nextContext: {
        currentSymbolId: currentSymbol.id,
        currentSymbolKind: currentSymbol.kind,
      },
    };
  }

  if (node.type === 'identifier') {
    handleDartImportedTypeCall(
      node,
      filePath,
      relations,
      importedSymbolPaths,
      importedSymbolKinds,
      localValueReturningMethods,
      state.currentSymbolId,
    );
    handleDartIdentifierReference(
      node,
      filePath,
      relations,
      importedSymbolPaths,
      state.currentSymbolId,
      state.currentSymbolKind,
    );
  }

  return;
}

export function analyzeDartFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const importedSymbolPaths = new Map<string, string | null>();
  const importedSymbolKinds = new Map<string, string>();
  const localValueReturningMethods = new Set<string>();
  const pendingSymbolContext = { value: undefined as { id?: string; kind: string } | undefined };
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node, state) =>
    visitDartNode(
      node,
      state,
      filePath,
      workspaceRoot,
      relations,
      symbols,
      importedSymbolPaths,
      importedSymbolKinds,
      localValueReturningMethods,
      pendingSymbolContext,
      symbolsEnabled,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function readDartSymbols(filePath: string): Array<{ kind: string; name: string }> {
  try {
    const parser = new Parser();
    parser.setLanguage(DartLanguage as unknown as Parser.Language);
    const rootNode = parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
    const symbols = new Map<string, string>();
    for (const node of rootNode.descendantsOfType([
      'class_definition',
      'enum_declaration',
      'extension_declaration',
      'function_signature',
      'mixin_declaration',
      'type_alias',
    ])) {
      if (node.type === 'function_signature' && node.parent?.type !== 'program') {
        continue;
      }

      const name = node.childForFieldName('name')?.text
        ?? node.namedChildren.find((child) => child.type === 'identifier' || child.type === 'type_identifier')?.text;
      if (name) {
        symbols.set(name, getDartImportedSymbolKind(node));
      }
    }
    return [...symbols].map(([name, kind]) => ({ kind, name }));
  } catch {
    return [];
  }
}

function registerDartLocalType(
  node: Parser.SyntaxNode,
  filePath: string,
  kind: string,
  symbolPaths: Map<string, string | null>,
  symbolKinds: Map<string, string>,
): void {
  const name = node.childForFieldName('name')?.text
    ?? node.namedChildren.find((child) => child.type === 'identifier' || child.type === 'type_identifier')?.text;
  if (name) {
    symbolPaths.set(name, filePath);
    symbolKinds.set(name, kind);
  }
}

function getDartImportedSymbolKind(node: Parser.SyntaxNode): string {
  if (node.type === 'type_alias') {
    return 'alias';
  }
  if (node.type === 'mixin_declaration') {
    return 'mixin';
  }
  if (node.type === 'enum_declaration') {
    return 'enum';
  }
  if (node.type === 'extension_declaration') {
    return 'extension';
  }
  if (node.type === 'function_signature') {
    return 'function';
  }
  return 'class';
}

function getDartTypeDeclarationKind(node: Parser.SyntaxNode): string {
  return getDartImportedSymbolKind(node);
}

function handleDartImportedTypeCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedTypePaths: ReadonlyMap<string, string | null>,
  importedSymbolKinds: ReadonlyMap<string, string>,
  localValueReturningMethods: ReadonlySet<string>,
  currentSymbolId?: string,
): void {
  const isSelectorCall = isDartSelectorCall(node);
  const resolvedPath = importedTypePaths.get(node.text)
    ?? (isSelectorCall && localValueReturningMethods.has(node.text) ? filePath : undefined);
  if (
    !resolvedPath
    || importedSymbolKinds.get(node.text) === 'enum'
    || !isFollowedByDartArgumentSelector(node)
  ) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    {
      importedName: node.text,
      localName: node.text,
      resolvedPath,
      specifier: node.text,
    },
    currentSymbolId,
    undefined,
    isSelectorCall ? node.text : undefined,
  );
}

function handleDartTypeReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
): void {
  const resolvedPath = symbolPaths.get(node.text);
  if (!resolvedPath || resolvedPath === filePath || isDartInheritedTypeReference(node)) {
    return;
  }

  addReferenceRelation(relations, filePath, node.text, resolvedPath, currentSymbolId);
}

function handleDartIdentifierReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
  currentSymbolKind?: string,
): void {
  const resolvedPath = symbolPaths.get(node.text);
  if (
    !resolvedPath
    || resolvedPath === filePath
    || !isDartTypeLikeExpressionReference(node)
    || isDartConcreteMethodBodyTypeReference(node, currentSymbolId, currentSymbolKind)
  ) {
    return;
  }

  addReferenceRelation(relations, filePath, node.text, resolvedPath, currentSymbolId);
}

function isDartConcreteMethodBodyTypeReference(
  node: Parser.SyntaxNode,
  currentSymbolId?: string,
  currentSymbolKind?: string,
): boolean {
  return (currentSymbolKind === 'method' || Boolean(currentSymbolId?.includes(':method:')))
    && (node.parent?.type.includes('selector') || Boolean(findDartAncestor(node, 'function_body')));
}

function handleDartAliasTypeReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  symbolKinds: ReadonlyMap<string, string>,
  currentSymbolId?: string,
): void {
  for (const typeIdentifier of node.descendantsOfType('type_identifier')) {
    if (symbolKinds.get(typeIdentifier.text) !== 'alias') {
      continue;
    }
    handleDartTypeReference(typeIdentifier, filePath, relations, symbolPaths, currentSymbolId);
  }
}

function handleDartAliasTypeIdentifierReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  symbolKinds: ReadonlyMap<string, string>,
  currentSymbolId?: string,
): void {
  if (symbolKinds.get(node.text) !== 'alias') {
    return;
  }

  const resolvedPath = symbolPaths.get(node.text);
  if (relations.some((relation) =>
    relation.kind === 'reference'
    && relation.fromFilePath === filePath
    && relation.specifier === node.text
    && relation.resolvedPath === resolvedPath
    && relation.fromSymbolId === currentSymbolId
  )) {
    return;
  }

  handleDartTypeReference(node, filePath, relations, symbolPaths, currentSymbolId);
}

function addDartSignatureReferenceRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
): void {
  if (isDartAbstractInterfaceMemberSignature(node)) {
    return;
  }

  for (const typeIdentifier of node.descendantsOfType('type_identifier')) {
    if (shouldSkipDartConcreteMethodReturnType(node, typeIdentifier)) {
      continue;
    }
    handleDartTypeReference(typeIdentifier, filePath, relations, symbolPaths, currentSymbolId);
  }
}

function addDartTypeDeclarationReferenceRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
): void {
  if (node.type !== 'type_alias' && node.type !== 'extension_declaration') {
    return;
  }

  for (const typeIdentifier of node.descendantsOfType('type_identifier')) {
    if (typeIdentifier === node.namedChildren.find((child) => child.type === 'type_identifier')) {
      continue;
    }
    handleDartTypeReference(typeIdentifier, filePath, relations, symbolPaths, currentSymbolId);
  }
}

function isDartTypeLikeExpressionReference(node: Parser.SyntaxNode): boolean {
  if (!/^[A-Z]/u.test(node.text)) {
    return false;
  }

  const parent = node.parent;
  if (!parent) {
    return false;
  }

  if (parent.type === 'selector') {
    return true;
  }

  if (isFollowedByDartArgumentSelector(node)) {
    return true;
  }

  if (parent.type === 'initialized_formal_parameter') {
    return false;
  }

  return parent.type !== 'class_definition'
    && parent.type !== 'mixin_declaration'
    && parent.type !== 'extension_declaration'
    && parent.type !== 'function_signature'
    && parent.type !== 'method_signature'
    && parent.type !== 'type_alias'
    && parent.type !== 'typed_identifier'
    && parent.type !== 'static_final_declaration'
    && parent.type !== 'initialized_variable_definition'
    && parent.type !== 'local_variable_declaration';
}

function shouldSkipDartConcreteMethodReturnType(
  signature: Parser.SyntaxNode,
  typeIdentifier: Parser.SyntaxNode,
): boolean {
  if (typeIdentifier.previousNamedSibling !== null || !isDartSignatureReturnType(signature, typeIdentifier)) {
    return false;
  }

  for (let current: Parser.SyntaxNode | null = signature; current; current = current.parent) {
    if (current.type === 'method_signature') {
      return current.nextNamedSibling?.type === 'function_body';
    }

    if (current.type === 'declaration') {
      return current.namedChildren.some((child) => child.type === 'function_body');
    }
  }

  return false;
}

function findDartAncestor(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | null {
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (current.type === type) {
      return current;
    }
  }

  return null;
}

function isDartSignatureReturnType(
  signature: Parser.SyntaxNode,
  typeIdentifier: Parser.SyntaxNode,
): boolean {
  return typeIdentifier.parent === signature
    || typeIdentifier.parent?.parent === signature;
}

function isDartAbstractInterfaceMemberSignature(node: Parser.SyntaxNode): boolean {
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (current.type === 'class_definition') {
      return /\babstract\s+interface\s+class\b/u.test(current.text);
    }
  }

  return false;
}

function isDartInheritedTypeReference(node: Parser.SyntaxNode): boolean {
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (current.type === 'class_definition') {
      const classBody = current.namedChildren.find((child) => child.type === 'class_body');
      return Boolean(classBody && node.endIndex <= classBody.startIndex);
    }
    if (current.type === 'function_signature' || current.type === 'method_signature') {
      return false;
    }
  }

  return false;
}

function isFollowedByDartArgumentSelector(node: Parser.SyntaxNode): boolean {
  const selector = findDartSelectorAncestor(node);
  if (
    selector
    && (node.nextNamedSibling?.type === 'argument_part'
      || selector.namedChildren.some((child) => child.type === 'argument_part')
      || selector.nextNamedSibling?.namedChildren.some((child) => child.type === 'argument_part'))
  ) {
    return true;
  }

  const nextNode = node.nextNamedSibling;
  return nextNode?.type === 'selector'
    && nextNode.namedChildren.some((child) => child.type === 'argument_part');
}

function isDartSelectorCall(node: Parser.SyntaxNode): boolean {
  return Boolean(findDartSelectorAncestor(node)?.text.startsWith('.'));
}

function findDartSelectorAncestor(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (current.type === 'selector') {
      return current;
    }
  }

  return null;
}

function registerDartValueReturningMethod(
  node: Parser.SyntaxNode,
  filePath: string,
  symbolPaths: Map<string, string | null>,
  symbolKinds: Map<string, string>,
  localValueReturningMethods: Set<string>,
): void {
  const signature = node.namedChildren.find((child) => child.type === 'function_signature');
  const returnType = signature?.namedChildren.find((child) =>
    child.type === 'type_identifier' || child.type === 'void_type'
  )?.text;
  const name = signature?.childForFieldName('name')?.text
    ?? signature?.namedChildren.find((child) => child.type === 'identifier')?.text;

  if (!name || returnType === 'void') {
    return;
  }

  symbolPaths.set(name, filePath);
  symbolKinds.set(name, 'method');
  localValueReturningMethods.add(name);
}

function toDartTypeName(specifier: string): string | null {
  const basename = specifier.split('/').pop()?.replace(/\.dart$/, '');
  if (!basename) {
    return null;
  }

  return basename
    .split('_')
    .filter(Boolean)
    .map(part => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('');
}
