import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { handleJavaScriptCallExpression } from './calls';
import {
  handleJavaScriptClassDeclaration,
  handleJavaScriptFunctionDeclaration,
  handleJavaScriptMethodDefinition,
  handleJavaScriptTypeDeclaration,
  handleJavaScriptVariableDeclarator,
} from './declarations';
import {
  handleJavaScriptExportStatement,
  handleJavaScriptImportStatement,
} from './imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

type JavaScriptVisitContext = {
  filePath: string;
  importedBindings: Map<string, ImportedBinding>;
  relations: IAnalysisRelation[];
  state: SymbolWalkState;
  symbols: IAnalysisSymbol[];
  symbolsEnabled: boolean;
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void;
};

type JavaScriptNodeVisitor = (
  node: Parser.SyntaxNode,
  context: JavaScriptVisitContext,
) => TreeWalkAction<SymbolWalkState> | void;

const handleTypeDeclarationNode: JavaScriptNodeVisitor = (node, context) => {
  if (!context.symbolsEnabled) {
    return;
  }
  handleJavaScriptTypeDeclaration(node, context.filePath, context.symbols);
};

const JAVASCRIPT_NODE_VISITORS: Record<string, JavaScriptNodeVisitor> = {
  call_expression: (node, context) => {
    handleJavaScriptCallExpression(
      node,
      context.filePath,
      context.relations,
      context.importedBindings,
      context.state.currentSymbolId,
    );
  },
  class_declaration: (node, context) => {
    if (!context.symbolsEnabled) {
      return;
    }
    handleJavaScriptClassDeclaration(node, context.filePath, context.symbols);
  },
  enum_declaration: handleTypeDeclarationNode,
  export_statement: (node, context) => {
    handleJavaScriptExportStatement(node, context.filePath, context.relations);
  },
  function_declaration: (node, context) =>
    context.symbolsEnabled
      ? handleJavaScriptFunctionDeclaration(node, context.filePath, context.symbols, context.walk)
      : undefined,
  import_statement: (node, context) =>
    handleJavaScriptImportStatement(node, context.filePath, context.relations, context.importedBindings),
  interface_declaration: handleTypeDeclarationNode,
  method_definition: (node, context) =>
    context.symbolsEnabled
      ? handleJavaScriptMethodDefinition(node, context.filePath, context.symbols, context.walk)
      : undefined,
  type_alias_declaration: handleTypeDeclarationNode,
  variable_declarator: (node, context) =>
    context.symbolsEnabled
      ? handleJavaScriptVariableDeclarator(node, context.filePath, context.symbols, context.walk)
      : undefined,
};

function visitJavaScriptNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
  symbolsEnabled: boolean,
): TreeWalkAction<SymbolWalkState> | void {
  const visitor = JAVASCRIPT_NODE_VISITORS[node.type];
  return visitor?.(node, {
    filePath,
    importedBindings,
    relations,
    state,
    symbols,
    symbolsEnabled,
    walk,
  });
}

export function analyzeJavaScriptFamilyFile(
  filePath: string,
  tree: Parser.Tree,
  _workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitJavaScriptNode(
      node,
      state,
      walk,
      filePath,
      relations,
      symbols,
      importedBindings,
      symbolsEnabled,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
