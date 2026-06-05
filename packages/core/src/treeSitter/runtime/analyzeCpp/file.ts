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

function addCppInheritanceRelations(
  source: string,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolsEnabled: boolean,
): void {
  const targetPath = relations.find((relation) =>
    relation.kind === 'import' && relation.resolvedPath
  )?.resolvedPath ?? null;

  for (const match of source.matchAll(/\bclass\s+([A-Za-z_]\w*)\s*:\s*(?:public|protected|private)?\s*([A-Za-z_]\w*)\s*\{/g)) {
    const [, className, baseName] = match;
    const classSymbolId = symbolsEnabled ? createSymbolId(filePath, 'class', className) : undefined;
    addInheritRelation(relations, filePath, baseName, targetPath, classSymbolId);
  }

  for (const methodMatch of source.matchAll(/\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:const\s*)?override\b/g)) {
    const methodName = methodMatch[1];
    const methodSymbolId = symbolsEnabled ? createSymbolId(filePath, 'method', methodName) : undefined;
    addOverrideRelation(relations, filePath, methodName, targetPath, methodSymbolId);
  }
}
