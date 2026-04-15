import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { handleGoImportDeclaration } from './goImports';
import {
  handleGoCallableDeclaration,
  handleGoCallExpression,
  handleGoTypeSpec,
} from './goHandlers';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { normalizeAnalysisResult } from './results';
import { walkTree } from './walk';

function visitGoNode(
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
    case 'import_declaration': {
      return handleGoImportDeclaration(node, filePath, workspaceRoot, relations, importedBindings);
    }
    case 'function_declaration':
    case 'method_declaration': {
      return handleGoCallableDeclaration(node, filePath, symbols, walk);
    }
    case 'type_spec': {
      handleGoTypeSpec(node, filePath, symbols);
      return;
    }
    case 'call_expression': {
      handleGoCallExpression(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    }
    default:
      return;
  }
}

export function analyzeGoFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitGoNode(
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
