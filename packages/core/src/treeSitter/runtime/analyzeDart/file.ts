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
  pendingSymbolId: { value: string | undefined },
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
        for (const symbolName of readDartSymbolNames(importRelation.resolvedPath)) {
          importedSymbolPaths.set(symbolName, importRelation.resolvedPath);
        }
      }
    }
    return { skipChildren: true };
  }

  if (node.type === 'class_definition') {
    registerDartLocalType(node, filePath, importedSymbolPaths);
    handleDartClassDefinition(node, filePath, relations, symbols, symbolsEnabled, importedSymbolPaths);
    return;
  }

  if (
    node.type === 'mixin_declaration'
    || node.type === 'enum_declaration'
    || node.type === 'type_alias'
    || node.type === 'extension_declaration'
  ) {
    registerDartLocalType(node, filePath, importedSymbolPaths);
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

  if (node.type === 'method_signature') {
    if (!symbolsEnabled) {
      return;
    }
    const previousSymbolCount = symbols.length;
    const action = handleDartFunctionSignature(node, filePath, symbols);
    const symbolId = symbols.length > previousSymbolCount ? symbols.at(-1)?.id : undefined;
    pendingSymbolId.value = symbolId;
    addDartSignatureReferenceRelations(node, filePath, relations, importedSymbolPaths, symbolId);
    return action;
  }

  if (node.type === 'function_signature' && node.parent?.type !== 'method_signature') {
    if (!symbolsEnabled) {
      return;
    }
    const previousSymbolCount = symbols.length;
    const action = handleDartFunctionSignature(node, filePath, symbols);
    const symbolId = symbols.length > previousSymbolCount ? symbols.at(-1)?.id : undefined;
    pendingSymbolId.value = symbolId;
    addDartSignatureReferenceRelations(node, filePath, relations, importedSymbolPaths, symbolId);
    return action;
  }

  if (node.type === 'local_variable_declaration') {
    if (symbolsEnabled) {
      handleDartLocalDeclaration(node, filePath, symbols);
    }
  }

  if (node.type === 'function_body' && pendingSymbolId.value) {
    const currentSymbolId = pendingSymbolId.value;
    pendingSymbolId.value = undefined;
    return { nextContext: { currentSymbolId } };
  }

  if (node.type === 'type_identifier') {
    handleDartTypeReference(node, filePath, relations, importedSymbolPaths, state.currentSymbolId);
  }

  if (node.type === 'identifier') {
    handleDartImportedTypeCall(node, filePath, relations, importedSymbolPaths, state.currentSymbolId);
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
  const pendingSymbolId = { value: undefined as string | undefined };
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
      pendingSymbolId,
      symbolsEnabled,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function readDartSymbolNames(filePath: string): string[] {
  try {
    const parser = new Parser();
    parser.setLanguage(DartLanguage as unknown as Parser.Language);
    const rootNode = parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
    const names = new Set<string>();
    for (const node of rootNode.descendantsOfType([
      'class_definition',
      'enum_declaration',
      'extension_declaration',
      'function_signature',
      'mixin_declaration',
      'type_alias',
    ])) {
      if (node.type === 'class_definition') {
        const name = node.childForFieldName('name')?.text
          ?? node.namedChildren.find((child) => child.type === 'type_identifier')?.text;
        if (name) {
          names.add(name);
        }
        continue;
      }

      const name = node.childForFieldName('name')?.text
        ?? node.namedChildren.find((child) => child.type === 'identifier' || child.type === 'type_identifier')?.text;
      if (name) {
        names.add(name);
      }
    }
    return [...names];
  } catch {
    return [];
  }
}

function registerDartLocalType(
  node: Parser.SyntaxNode,
  filePath: string,
  symbolPaths: Map<string, string | null>,
): void {
  const name = node.childForFieldName('name')?.text
    ?? node.namedChildren.find((child) => child.type === 'identifier' || child.type === 'type_identifier')?.text;
  if (name) {
    symbolPaths.set(name, filePath);
  }
}

function handleDartImportedTypeCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedTypePaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
): void {
  const resolvedPath = importedTypePaths.get(node.text);
  if (!resolvedPath || !isFollowedByDartArgumentSelector(node)) {
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

function addDartSignatureReferenceRelations(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
): void {
  for (const typeIdentifier of node.descendantsOfType('type_identifier')) {
    if (shouldSkipDartSignatureTypeReference(typeIdentifier)) {
      continue;
    }
    handleDartTypeReference(typeIdentifier, filePath, relations, symbolPaths, currentSymbolId);
  }
}

function shouldSkipDartSignatureTypeReference(node: Parser.SyntaxNode): boolean {
  return node.parent?.type === 'function_signature'
    && node.previousNamedSibling === null;
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
  const nextNode = node.nextNamedSibling;
  return nextNode?.type === 'selector'
    && nextNode.namedChildren.some((child) => child.type === 'argument_part');
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
