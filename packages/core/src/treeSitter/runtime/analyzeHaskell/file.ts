import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
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
    return { skipChildren: true };
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
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  const { sourceRoot } = resolveHaskellSourceInfo(filePath, tree);
  walkTree(tree.rootNode, {}, (node) =>
    visitHaskellNode(node, filePath, sourceRoot, relations, symbols, symbolsEnabled),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
