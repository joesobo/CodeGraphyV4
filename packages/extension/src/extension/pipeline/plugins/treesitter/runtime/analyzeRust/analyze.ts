import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { handleRustUseDeclaration } from './imports';
import {
  handleRustCallExpression,
  handleRustFunctionItem,
  handleRustModuleItem,
  handleRustNamedSymbol,
} from './handlers';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';

function visitRustNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'use_declaration': {
      return handleRustUseDeclaration(node, filePath, workspaceRoot, relations, importedBindings);
    }
    case 'mod_item': {
      handleRustModuleItem(node, filePath, relations);
      return;
    }
    case 'struct_item':
    case 'enum_item':
    case 'trait_item': {
      const kind = node.type === 'struct_item'
        ? 'struct'
        : node.type === 'enum_item'
          ? 'enum'
          : 'trait';
      handleRustNamedSymbol(node, kind, filePath, symbols);
      return;
    }
    case 'function_item': {
      return handleRustFunctionItem(node, filePath, symbols, walk);
    }
    case 'call_expression': {
      handleRustCallExpression(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    }
    default:
      return;
  }
}

export function analyzeRustFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitRustNode(
      node,
      state,
      walk,
      filePath,
      workspaceRoot,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
