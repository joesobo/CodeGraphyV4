import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { handleKotlinImport } from './imports';
import { resolveKotlinSourceInfo } from './sourceInfo';
import {
  handleKotlinFunctionDeclaration,
  handleKotlinObjectDeclaration,
  handleKotlinTypeDeclaration,
} from './symbols';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';
import { collectKotlinCallablePaths } from './callablePaths';
import { handleKotlinCallExpression } from './calls';

function visitKotlinNode(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import': {
      handleKotlinImport(node, filePath, sourceRoot, relations, importedBindings);
      return { skipChildren: true };
    }
    case 'class_declaration': {
      handleKotlinTypeDeclaration(
        node,
        filePath,
        sourceRoot,
        packageName,
        relations,
        symbols,
        importedBindings,
        symbolsEnabled,
      );
      return;
    }
    case 'object_declaration': {
      if (!symbolsEnabled) {
        return;
      }
      handleKotlinObjectDeclaration(node, filePath, symbols);
      return;
    }
    case 'function_declaration': {
      return symbolsEnabled
        ? handleKotlinFunctionDeclaration(node, filePath, symbols)
        : undefined;
    }
    default:
      return;
  }
}

export function analyzeKotlinFile(
  filePath: string,
  tree: Parser.Tree,
  _workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  const { packageName, sourceRoot } = resolveKotlinSourceInfo(filePath, tree);
  const callablePaths = collectKotlinCallablePaths(filePath, tree, sourceRoot, packageName);
  walkTree<SymbolWalkState>(tree.rootNode, {}, (node, state) => {
    const action = visitKotlinNode(
      node,
      filePath,
      sourceRoot,
      packageName,
      relations,
      symbols,
      importedBindings,
      symbolsEnabled,
    );
    if (node.type === 'call_expression') {
      handleKotlinCallExpression(node, filePath, relations, importedBindings, callablePaths, state.currentSymbolId);
    }
    return action;
  });
  return normalizeAnalysisResult(filePath, symbols, relations);
}
