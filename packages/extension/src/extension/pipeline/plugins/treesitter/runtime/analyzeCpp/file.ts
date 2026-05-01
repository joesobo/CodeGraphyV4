import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleCInclude } from '../analyzeCFamily/includes';
import { handleCFamilySymbol } from '../analyzeCFamily/symbols';

function visitCppNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'preproc_include') {
    handleCInclude(node, filePath, workspaceRoot, relations);
    return { skipChildren: true };
  }

  return handleCFamilySymbol(node, filePath, symbols);
}

export function analyzeCppFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node) =>
    visitCppNode(node, filePath, workspaceRoot, relations, symbols),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
