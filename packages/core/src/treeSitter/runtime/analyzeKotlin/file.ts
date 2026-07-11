import * as fs from 'node:fs';
import * as path from 'node:path';
import KotlinLanguage from '@tree-sitter-grammars/tree-sitter-kotlin';
import Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addCallRelation, normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleKotlinImport } from './imports';
import { resolveKotlinSourceInfo } from './sourceInfo';
import {
  handleKotlinFunctionDeclaration,
  handleKotlinObjectDeclaration,
  handleKotlinTypeDeclaration,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';
import { getOrCreateTreeSitterParser } from '../languages/parser';

function visitKotlinNode(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import': {
      handleKotlinImport(node, filePath, sourceRoot, relations, importedBindings);
      return { skipChildren: true };
    }
    case 'class_declaration': {
      handleKotlinTypeDeclaration(
        node,
        filePath,
        sourceRoot,
        packageName,
        relations,
        symbols,
        importedBindings,
        symbolsEnabled,
      );
      return;
    }
    case 'object_declaration': {
      if (!symbolsEnabled) {
        return;
      }
      handleKotlinObjectDeclaration(node, filePath, symbols);
      return;
    }
    case 'function_declaration': {
      return symbolsEnabled
        ? handleKotlinFunctionDeclaration(node, filePath, symbols)
        : undefined;
    }
    default:
      return;
  }
}

export function analyzeKotlinFile(
  filePath: string,
  tree: Parser.Tree,
  _workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  const { packageName, sourceRoot } = resolveKotlinSourceInfo(filePath, tree);
  const callablePaths = collectKotlinCallablePaths(filePath, tree, sourceRoot, packageName);
  walkTree<SymbolWalkState>(tree.rootNode, {}, (node, state) => {
    const action = visitKotlinNode(
      node,
      filePath,
      sourceRoot,
      packageName,
      relations,
      symbols,
      importedBindings,
      symbolsEnabled,
    );
    if (node.type === 'call_expression') {
      handleKotlinCallExpression(node, filePath, relations, importedBindings, callablePaths, state.currentSymbolId);
    }
    return action;
  });
  return normalizeAnalysisResult(filePath, symbols, relations);
}

function handleKotlinCallExpression(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  callablePaths: ReadonlyMap<string, string>,
  currentSymbolId?: string,
): void {
  const calleeName = node.childForFieldName('function')?.text ?? node.namedChildren[0]?.text;
  if (!calleeName) {
    return;
  }

  const importedBinding = importedBindings.get(calleeName);
  const resolvedPath = importedBinding?.resolvedPath ?? callablePaths.get(calleeName) ?? null;
  if (!resolvedPath || resolvedPath === filePath) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    importedBinding ?? {
      importedName: calleeName,
      localName: calleeName,
      resolvedPath,
      specifier: calleeName,
    },
    currentSymbolId,
  );
}

function collectKotlinCallablePaths(
  filePath: string,
  tree: Parser.Tree,
  sourceRoot: string | null,
  packageName: string | null,
): Map<string, string> {
  const callablePaths = new Map<string, string>();
  addKotlinCallableNames(tree.rootNode, filePath, callablePaths);
  if (!sourceRoot || !packageName) {
    return callablePaths;
  }

  const packageDirectory = path.join(sourceRoot, ...packageName.split('.'));
  for (const candidatePath of readKotlinPackageFiles(packageDirectory)) {
    if (candidatePath === filePath) {
      continue;
    }

    const candidateRootNode = readKotlinRootNode(candidatePath);
    if (candidateRootNode) {
      addKotlinCallableNames(candidateRootNode, candidatePath, callablePaths);
    }
  }
  return callablePaths;
}

function addKotlinCallableNames(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  callablePaths: Map<string, string>,
): void {
  for (const node of rootNode.descendantsOfType([
    'class_declaration',
    'function_declaration',
    'object_declaration',
  ])) {
    const name = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
    if (name && !callablePaths.has(name)) {
      callablePaths.set(name, filePath);
    }
  }
}

function readKotlinPackageFiles(packageDirectory: string): string[] {
  try {
    return fs.readdirSync(packageDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.kt'))
      .map((entry) => path.join(packageDirectory, entry.name));
  } catch {
    return [];
  }
}

function readKotlinRootNode(filePath: string): Parser.SyntaxNode | null {
  try {
    const parser = getOrCreateTreeSitterParser(
      'kotlin',
      Parser,
      KotlinLanguage as unknown as Parser.Language,
    );
    return parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
  } catch {
    return null;
  }
}
