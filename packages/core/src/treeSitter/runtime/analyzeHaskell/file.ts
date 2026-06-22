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

interface HaskellImportList {
  callableNames: Set<string>;
  constructorNames: Set<string>;
  typeNames: Set<string>;
  typesWithConstructors: Set<string>;
}

interface HaskellModuleNames {
  callableNames: Set<string>;
  constructorNamesByType: Map<string, Set<string>>;
  typeNames: Set<string>;
}

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
      const importedNames = readImportedHaskellModuleNames(importRelation.resolvedPath);
      const importList = readHaskellImportList(node);
      for (const callableName of filterImportedHaskellCallableNames(importedNames, importList)) {
        importedCallablePaths.set(callableName, importRelation.resolvedPath);
      }
      for (const typeName of filterImportedHaskellTypeNames(importedNames, importList)) {
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

function readHaskellImportList(node: Parser.SyntaxNode): HaskellImportList | undefined {
  const importListNode = node.childForFieldName('names');
  if (!importListNode) {
    return undefined;
  }

  const importList: HaskellImportList = {
    callableNames: new Set(),
    constructorNames: new Set(),
    typeNames: new Set(),
    typesWithConstructors: new Set(),
  };

  for (const importName of importListNode.namedChildren.filter(child => child.type === 'import_name')) {
    const variableName = importName.childForFieldName('variable')?.text;
    if (variableName) {
      importList.callableNames.add(variableName);
    }

    const childrenNode = importName.childForFieldName('children');
    const typeName = importName.childForFieldName('type')?.text ?? importName.childForFieldName('name')?.text;
    if (typeName) {
      importList.typeNames.add(typeName);
      if (childrenNode?.text.includes('..')) {
        importList.typesWithConstructors.add(typeName);
      }
      for (const constructorName of childrenNode?.descendantsOfType('constructor') ?? []) {
        importList.constructorNames.add(constructorName.text);
      }
    }
  }

  return importList;
}

function filterImportedHaskellCallableNames(
  importedNames: HaskellModuleNames,
  importList: HaskellImportList | undefined,
): string[] {
  if (!importList) {
    return [...importedNames.callableNames];
  }

  const names = new Set<string>();
  for (const name of importList.callableNames) {
    if (importedNames.callableNames.has(name)) {
      names.add(name);
    }
  }
  for (const name of importList.constructorNames) {
    if (importedNames.callableNames.has(name)) {
      names.add(name);
    }
  }
  for (const typeName of importList.typesWithConstructors) {
    for (const constructorName of importedNames.constructorNamesByType.get(typeName) ?? []) {
      names.add(constructorName);
    }
  }

  return [...names];
}

function filterImportedHaskellTypeNames(
  importedNames: HaskellModuleNames,
  importList: HaskellImportList | undefined,
): string[] {
  if (!importList) {
    return [...importedNames.typeNames];
  }

  return [...importList.typeNames].filter(typeName => importedNames.typeNames.has(typeName));
}

function readImportedHaskellModuleNames(filePath: string): HaskellModuleNames {
  try {
    const parser = new Parser();
    parser.setLanguage(HaskellLanguage as unknown as Parser.Language);
    const rootNode = parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
    const callableNames = new Set<string>();
    const constructorNamesByType = new Map<string, Set<string>>();
    const typeNames = new Set<string>();

    for (const node of rootNode.descendantsOfType(['data_type', 'newtype', 'type_synonym', 'class'])) {
      const typeName = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
      if (!typeName) {
        continue;
      }

      typeNames.add(typeName);
      for (const constructorName of readHaskellConstructorNames(node)) {
        callableNames.add(constructorName);
        constructorNamesByType.set(typeName, new Set([
          ...(constructorNamesByType.get(typeName) ?? []),
          constructorName,
        ]));
      }
    }

    for (const node of rootNode.descendantsOfType('function')) {
      const name = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
      if (name) {
        callableNames.add(name);
      }
    }

    return { callableNames, constructorNamesByType, typeNames };
  } catch {
    return { callableNames: new Set(), constructorNamesByType: new Map(), typeNames: new Set() };
  }
}

function readHaskellConstructorNames(node: Parser.SyntaxNode): string[] {
  return node.descendantsOfType('constructor')
    .map(constructorNode => constructorNode.text)
    .filter((name, index, names) => names.indexOf(name) === index);
}
