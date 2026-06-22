import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { handleGoImportDeclaration } from './imports';
import {
  handleGoCallableDeclaration,
  handleGoCallExpression,
  handleGoConstSpec,
  handleGoQualifiedTypeReference,
  handleGoShortVarDeclaration,
  handleGoTypeSpec,
} from './handlers';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitGoNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_declaration': {
      return handleGoImportDeclaration(node, filePath, workspaceRoot, relations, importedBindings);
    }
    case 'function_declaration':
    case 'method_declaration': {
      return symbolsEnabled
        ? handleGoCallableDeclaration(node, filePath, symbols, walk)
        : undefined;
    }
    case 'type_spec': {
      if (!symbolsEnabled) {
        return;
      }
      handleGoTypeSpec(node, filePath, symbols, relations, importedBindings);
      return;
    }
    case 'const_spec': {
      if (!symbolsEnabled) {
        return;
      }
      handleGoConstSpec(node, filePath, symbols);
      return;
    }
    case 'short_var_declaration': {
      if (!symbolsEnabled) {
        return;
      }
      handleGoShortVarDeclaration(node, filePath, symbols);
      return;
    }
    case 'qualified_type': {
      handleGoQualifiedTypeReference(
        node,
        filePath,
        relations,
        importedBindings,
        state.currentSymbolId,
      );
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
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
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
      symbolsEnabled,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
