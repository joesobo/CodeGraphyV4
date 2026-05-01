import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleRubyRequireCall } from './imports';
import {
  handleRubyClass,
  handleRubyMethod,
  handleRubyModule,
} from './symbols';

function visitRubyNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'call' && handleRubyRequireCall(node, filePath, workspaceRoot, relations, importedBindings)) {
    return { skipChildren: true };
  }

  if (node.type === 'module') {
    handleRubyModule(node, filePath, symbols);
    return;
  }

  if (node.type === 'class') {
    handleRubyClass(node, filePath, relations, symbols, importedBindings);
    return;
  }

  if (node.type === 'method') {
    return handleRubyMethod(node, filePath, symbols);
  }

  return;
}

export function analyzeRubyFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node) =>
    visitRubyNode(node, filePath, workspaceRoot, relations, symbols, importedBindings),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
