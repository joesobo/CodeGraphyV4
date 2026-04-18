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

const RUST_NAMED_SYMBOL_KINDS = {
  enum_item: 'enum',
  struct_item: 'struct',
  trait_item: 'trait',
} as const satisfies Record<string, IAnalysisSymbol['kind']>;

function handleRustNamedItem(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): boolean {
  const kind = RUST_NAMED_SYMBOL_KINDS[node.type as keyof typeof RUST_NAMED_SYMBOL_KINDS];
  if (!kind) {
    return false;
  }

  handleRustNamedSymbol(node, kind, filePath, symbols);
  return true;
}

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
  if (node.type === 'use_declaration') {
    return handleRustUseDeclaration(node, filePath, workspaceRoot, relations, importedBindings);
  }

  if (node.type === 'mod_item') {
    handleRustModuleItem(node, filePath, relations);
    return;
  }

  if (handleRustNamedItem(node, filePath, symbols)) {
    return;
  }

  if (node.type === 'function_item') {
    return handleRustFunctionItem(node, filePath, symbols, walk);
  }

  if (node.type === 'call_expression') {
    handleRustCallExpression(node, filePath, relations, importedBindings, state.currentSymbolId);
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
