import * as fs from 'node:fs';
import Parser from 'tree-sitter';
import HaskellLanguage from 'tree-sitter-haskell';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import {
  addCallRelation,
  addReferenceRelation,
  createSymbolId,
  normalizeAnalysisResult,
} from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleHaskellImport } from './imports';
import { resolveHaskellSourceInfo } from './sourceInfo';
import {
  addHaskellLocalBindSymbols,
  addHaskellPatternParameterSymbols,
  addHaskellRecordFieldSymbol,
  addHaskellTopLevelBindSymbol,
  handleHaskellDeclaration,
  handleHaskellHeader,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitHaskellNode(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedCallablePaths: Map<string, string>,
  importedTypePaths: Map<string, string>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'header') {
    if (!symbolsEnabled) {
      return;
    }
    handleHaskellHeader(node, filePath, symbols);
    return;
  }

  if (node.type === 'import') {
    handleHaskellImport(node, filePath, sourceRoot, relations);
    const importRelation = relations.at(-1);
    if (importRelation?.kind === 'import' && importRelation.resolvedPath) {
      for (const callableName of readImportedHaskellCallableNames(importRelation.resolvedPath)) {
        importedCallablePaths.set(callableName, importRelation.resolvedPath);
      }
      for (const typeName of readImportedHaskellTypeNames(importRelation.resolvedPath)) {
        importedTypePaths.set(typeName, importRelation.resolvedPath);
      }
    }
    return { skipChildren: true };
  }

  if (node.type === 'function' || node.type === 'bind') {
    let currentSymbolKind = 'function';
    if (symbolsEnabled && node.type === 'function') {
      handleHaskellDeclaration(node, filePath, symbols);
    } else if (symbolsEnabled && isTopLevelHaskellBind(node)) {
      currentSymbolKind = addHaskellTopLevelBindSymbol(node, filePath, symbols) ?? currentSymbolKind;
    } else if (symbolsEnabled && isLocalHaskellBind(node)) {
      addHaskellLocalBindSymbols(node, filePath, symbols);
    }

    const functionName = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
    if (functionName) {
      return {
        nextContext: {
          currentSymbolId: createSymbolId(filePath, currentSymbolKind, functionName),
        },
      };
    }
  }

  if (!symbolsEnabled) {
    return;
  }

  if (node.type === 'field') {
    addHaskellRecordFieldSymbol(node, filePath, symbols);
    return;
  }

  if (node.type === 'patterns') {
    addHaskellPatternParameterSymbols(node, filePath, symbols);
    return;
  }

  return handleHaskellDeclaration(node, filePath, symbols);
}

export function analyzeHaskellFile(
  filePath: string,
  tree: Parser.Tree,
  _workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const importedCallablePaths = new Map<string, string>();
  const importedTypePaths = new Map<string, string>();
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  const { sourceRoot } = resolveHaskellSourceInfo(filePath, tree);
  walkTree<SymbolWalkState>(tree.rootNode, {}, (node, state) => {
    if (node.type === 'variable' || node.type === 'constructor') {
      handleHaskellImportedCall(node, filePath, relations, importedCallablePaths, node.text, state.currentSymbolId);
    }
    if (node.type === 'name') {
      handleHaskellImportedTypeReference(filePath, relations, importedTypePaths, node.text, state.currentSymbolId);
    }
    return visitHaskellNode(
      node,
      filePath,
      sourceRoot,
      relations,
      symbols,
      importedCallablePaths,
      importedTypePaths,
      symbolsEnabled,
    );
  },
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function isTopLevelHaskellBind(node: Parser.SyntaxNode): boolean {
  return node.parent?.type === 'declarations';
}

function isLocalHaskellBind(node: Parser.SyntaxNode): boolean {
  return node.parent?.type === 'local_binds';
}

function handleHaskellImportedCall(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedCallablePaths: ReadonlyMap<string, string>,
  name: string,
  currentSymbolId?: string,
): void {
  if (node.parent?.type !== 'apply') {
    return;
  }

  const resolvedPath = importedCallablePaths.get(name);
  if (!resolvedPath) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    {
      importedName: name,
      localName: name,
      resolvedPath,
      specifier: name,
    },
    currentSymbolId,
  );
}

function handleHaskellImportedTypeReference(
  filePath: string,
  relations: IAnalysisRelation[],
  importedTypePaths: ReadonlyMap<string, string>,
  name: string,
  currentSymbolId?: string,
): void {
  const resolvedPath = importedTypePaths.get(name);
  if (!resolvedPath) {
    return;
  }

  addReferenceRelation(relations, filePath, name, resolvedPath, currentSymbolId);
}

function readImportedHaskellCallableNames(filePath: string): string[] {
  try {
    const parser = new Parser();
    parser.setLanguage(HaskellLanguage as unknown as Parser.Language);
    const rootNode = parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
    const names = new Set<string>();
    for (const node of rootNode.descendantsOfType(['data_type', 'newtype', 'function'])) {
      const name = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
      if (name) {
        names.add(name);
      }
    }
    return [...names];
  } catch {
    return [];
  }
}

function readImportedHaskellTypeNames(filePath: string): string[] {
  try {
    const parser = new Parser();
    parser.setLanguage(HaskellLanguage as unknown as Parser.Language);
    const rootNode = parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
    const names = new Set<string>();
    for (const node of rootNode.descendantsOfType(['data_type', 'newtype', 'type_synonym', 'class'])) {
      const name = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
      if (name) {
        names.add(name);
      }
    }
    return [...names];
  } catch {
    return [];
  }
}
