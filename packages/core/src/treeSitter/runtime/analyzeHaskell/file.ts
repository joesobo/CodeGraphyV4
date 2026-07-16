import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { resolveHaskellSourceInfo } from './sourceInfo';
import { handleHaskellImportedCall, handleHaskellImportedTypeReference } from './references';
import { visitHaskellNode } from './visitor';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

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
    return visitHaskellNode(node, {
      filePath,
      sourceRoot,
      relations,
      symbols,
      importedCallablePaths,
      importedTypePaths,
      symbolsEnabled,
    });
  },
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
