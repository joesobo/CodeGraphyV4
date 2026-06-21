import * as fs from 'node:fs';
import Parser from 'tree-sitter';
import HaskellLanguage from 'tree-sitter-haskell';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addCallRelation, createSymbolId, normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleHaskellImport } from './imports';
import { resolveHaskellSourceInfo } from './sourceInfo';
import {
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
    }
    return { skipChildren: true };
  }

  if (node.type === 'function' || node.type === 'bind') {
    if (symbolsEnabled && node.type === 'function') {
      handleHaskellDeclaration(node, filePath, symbols);
    }
    const functionName = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
    if (functionName) {
      return {
        nextContext: {
          currentSymbolId: createSymbolId(filePath, 'function', functionName),
        },
      };
    }
  }

  if (!symbolsEnabled) {
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
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  const { sourceRoot } = resolveHaskellSourceInfo(filePath, tree);
  walkTree<SymbolWalkState>(tree.rootNode, {}, (node, state) => {
    if (node.type === 'variable' || node.type === 'constructor') {
      handleHaskellImportedCall(node, filePath, relations, importedCallablePaths, node.text, state.currentSymbolId);
    }
    return visitHaskellNode(node, filePath, sourceRoot, relations, symbols, importedCallablePaths, symbolsEnabled);
  },
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
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

function readImportedHaskellCallableNames(filePath: string): string[] {
  try {
    const parser = new Parser();
    parser.setLanguage(HaskellLanguage as unknown as Parser.Language);
    const rootNode = parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
    const names = new Set<string>();
    for (const node of rootNode.descendantsOfType(['data_type', 'function'])) {
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
