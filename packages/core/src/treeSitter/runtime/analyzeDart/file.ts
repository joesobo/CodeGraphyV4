import * as fs from 'node:fs';
import DartLanguage from '@driftlog/tree-sitter-dart';
import Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addCallRelation, normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleDartLibraryImport } from './imports';
import {
  handleDartClassDefinition,
  handleDartFunctionSignature,
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
  importedCallablePaths: Map<string, string | null>,
  pendingSymbolId: { value: string | undefined },
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'library_import') {
    handleDartLibraryImport(node, filePath, workspaceRoot, relations);
    const importRelation = relations.at(-1);
    if (importRelation?.kind === 'import') {
      const typeName = toDartTypeName(importRelation.specifier ?? '');
      if (typeName) {
        importedCallablePaths.set(typeName, importRelation.resolvedPath ?? null);
      }
      if (importRelation.resolvedPath) {
        for (const callableName of readImportedDartCallableNames(importRelation.resolvedPath)) {
          importedCallablePaths.set(callableName, importRelation.resolvedPath);
        }
      }
    }
    return { skipChildren: true };
  }

  if (node.type === 'class_definition') {
    handleDartClassDefinition(node, filePath, relations, symbols, symbolsEnabled, importedCallablePaths);
    return;
  }

  if (node.type === 'mixin_declaration' || node.type === 'enum_declaration') {
    if (!symbolsEnabled) {
      return;
    }
    handleDartTypeDeclaration(node, filePath, symbols);
    return;
  }

  if (node.type === 'method_signature') {
    if (!symbolsEnabled) {
      return;
    }
    const action = handleDartFunctionSignature(node, filePath, symbols);
    pendingSymbolId.value = symbols.at(-1)?.id;
    return action;
  }

  if (node.type === 'function_signature' && node.parent?.type !== 'method_signature') {
    if (!symbolsEnabled) {
      return;
    }
    const action = handleDartFunctionSignature(node, filePath, symbols);
    pendingSymbolId.value = symbols.at(-1)?.id;
    return action;
  }

  if (node.type === 'function_body' && pendingSymbolId.value) {
    const currentSymbolId = pendingSymbolId.value;
    pendingSymbolId.value = undefined;
    return { nextContext: { currentSymbolId } };
  }

  if (node.type === 'identifier') {
    handleDartImportedTypeCall(node, filePath, relations, importedCallablePaths, state.currentSymbolId);
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
  const importedCallablePaths = new Map<string, string | null>();
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
      importedCallablePaths,
      pendingSymbolId,
      symbolsEnabled,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function readImportedDartCallableNames(filePath: string): string[] {
  try {
    const parser = new Parser();
    parser.setLanguage(DartLanguage as unknown as Parser.Language);
    const rootNode = parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
    const names = new Set<string>();
    for (const node of rootNode.descendantsOfType(['class_definition', 'function_signature'])) {
      if (node.type === 'class_definition') {
        const name = node.childForFieldName('name')?.text
          ?? node.namedChildren.find((child) => child.type === 'type_identifier')?.text;
        if (name) {
          names.add(name);
        }
        continue;
      }

      const name = node.childForFieldName('name')?.text
        ?? node.namedChildren.find((child) => child.type === 'identifier')?.text;
      if (name) {
        names.add(name);
      }
    }
    return [...names];
  } catch {
    return [];
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
