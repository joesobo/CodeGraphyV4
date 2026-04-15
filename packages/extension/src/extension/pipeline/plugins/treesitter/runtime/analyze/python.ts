import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import {
  handlePythonImportFromStatement,
  handlePythonImportStatement,
} from './pythonImports';
import {
  handlePythonCall,
  handlePythonClassDefinition,
  handlePythonFunctionDefinition,
} from './pythonSymbols';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { normalizeAnalysisResult } from './results';
import { walkTree } from './walk';

function visitPythonNode(
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
    case 'import_statement': {
      return handlePythonImportStatement(node, filePath, workspaceRoot, relations, importedBindings);
    }
    case 'import_from_statement': {
      return handlePythonImportFromStatement(node, filePath, workspaceRoot, relations, importedBindings);
    }
    case 'class_definition': {
      handlePythonClassDefinition(node, filePath, symbols);
      return;
    }
    case 'function_definition': {
      return handlePythonFunctionDefinition(node, filePath, symbols, walk);
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
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
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
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
