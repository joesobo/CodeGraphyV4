import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { handleJavaScriptCallExpression } from './javascriptCalls';
import {
  handleJavaScriptClassDeclaration,
  handleJavaScriptFunctionDeclaration,
  handleJavaScriptMethodDefinition,
  handleJavaScriptVariableDeclarator,
} from './javascriptDeclarations';
import {
  handleJavaScriptExportStatement,
  handleJavaScriptImportStatement,
} from './javascriptImports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { normalizeAnalysisResult } from './results';
import { walkTree } from './walk';

function visitJavaScriptNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_statement': {
      return handleJavaScriptImportStatement(node, filePath, relations, importedBindings);
    }
    case 'export_statement': {
      handleJavaScriptExportStatement(node, filePath, relations);
      return;
    }
    case 'function_declaration': {
      return handleJavaScriptFunctionDeclaration(node, filePath, symbols, walk);
    }
    case 'class_declaration': {
      handleJavaScriptClassDeclaration(node, filePath, symbols);
      return;
    }
    case 'method_definition': {
      return handleJavaScriptMethodDefinition(node, filePath, symbols, walk);
    }
    case 'variable_declarator': {
      return handleJavaScriptVariableDeclarator(node, filePath, symbols, walk);
    }
    case 'call_expression': {
      handleJavaScriptCallExpression(node, filePath, relations, importedBindings, state.currentSymbolId);
      return;
    }
    default:
      return;
  }
}

export function analyzeJavaScriptFamilyFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitJavaScriptNode(node, state, walk, filePath, relations, symbols, importedBindings),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
