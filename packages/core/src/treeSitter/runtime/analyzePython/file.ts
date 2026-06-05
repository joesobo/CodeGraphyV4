import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import {
  handlePythonImportFromStatement,
  handlePythonImportStatement,
} from './imports';
import {
  handlePythonCall,
  handlePythonClassDefinition,
  handlePythonFunctionDefinition,
} from './symbols';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

function visitPythonNode(
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
    case 'import_statement': {
      return handlePythonImportStatement(node, filePath, workspaceRoot, relations, importedBindings);
    }
    case 'import_from_statement': {
      return handlePythonImportFromStatement(node, filePath, workspaceRoot, relations, importedBindings);
    }
    case 'class_definition': {
      handlePythonClassDefinition(node, filePath, relations, symbols, importedBindings, symbolsEnabled);
      return;
    }
    case 'function_definition': {
      return symbolsEnabled
        ? handlePythonFunctionDefinition(node, filePath, symbols, walk)
        : undefined;
    }
    case 'call': {
      handlePythonCall(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    }
    default:
      return;
  }
}

export function analyzePythonFile(
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
    visitPythonNode(
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
