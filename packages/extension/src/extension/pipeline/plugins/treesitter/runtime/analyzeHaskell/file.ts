import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleHaskellImport } from './imports';
import { resolveHaskellSourceInfo } from './sourceInfo';
import {
  handleHaskellDeclaration,
  handleHaskellHeader,
} from './symbols';

function visitHaskellNode(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'header') {
    handleHaskellHeader(node, filePath, symbols);
    return;
  }

  if (node.type === 'import') {
    handleHaskellImport(node, filePath, sourceRoot, relations);
    return { skipChildren: true };
  }

  return handleHaskellDeclaration(node, filePath, symbols);
}

export function analyzeHaskellFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const { sourceRoot } = resolveHaskellSourceInfo(filePath, tree);
  walkTree(tree.rootNode, {}, (node) =>
    visitHaskellNode(node, filePath, sourceRoot, relations, symbols),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
