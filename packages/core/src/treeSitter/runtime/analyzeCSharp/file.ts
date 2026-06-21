import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import {
  handleCSharpNamespaceNode,
  handleCSharpUsingDirective,
} from './namespace';
import {
  handleCSharpConstructorDeclaration,
  handleCSharpEventFieldDeclaration,
  handleCSharpFieldDeclaration,
  handleCSharpLocalDeclaration,
  handleCSharpLocalFunctionDeclaration,
  handleCSharpMethodDeclaration,
  handleCSharpParameter,
  handleCSharpPropertyDeclaration,
  handleCSharpTypeDeclaration,
} from './declarations';
import type { CSharpWalkState } from './model';
import {
  appendCSharpUsingImportRelations,
  collectCSharpUsingTargetNode,
  handleCSharpCallNode,
  handleCSharpTypeReferenceNode,
} from './references';
import type { TreeWalkAction } from '../analyze/model';
import { getCSharpFileScopedNamespaceName } from './namespaceNames';
import { normalizeAnalysisResult } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

const CSHARP_TYPE_DECLARATIONS = new Set([
  'class_declaration',
  'delegate_declaration',
  'interface_declaration',
  'record_declaration',
  'struct_declaration',
  'enum_declaration',
]);

type CSharpVisitorContext = {
  filePath: string;
  workspaceRoot: string;
  relations: IAnalysisRelation[];
  symbols: IAnalysisSymbol[];
  usingNamespaces: Set<string>;
  importTargetsByNamespace: Map<string, Set<string>>;
  symbolsEnabled: boolean;
};

type CSharpStatefulSymbolHandler = (
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
) => TreeWalkAction<CSharpWalkState> | void;

type CSharpSimpleSymbolHandler = (
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
) => void;

const CSHARP_STATEFUL_SYMBOL_HANDLERS: Record<string, CSharpStatefulSymbolHandler> = {
  constructor_declaration: handleCSharpConstructorDeclaration,
  local_function_statement: handleCSharpLocalFunctionDeclaration,
  method_declaration: handleCSharpMethodDeclaration,
};

const CSHARP_SIMPLE_SYMBOL_HANDLERS: Record<string, CSharpSimpleSymbolHandler> = {
  event_field_declaration: handleCSharpEventFieldDeclaration,
  field_declaration: handleCSharpFieldDeclaration,
  local_declaration_statement: handleCSharpLocalDeclaration,
  parameter: handleCSharpParameter,
  property_declaration: handleCSharpPropertyDeclaration,
};

function handleCSharpTypeNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  context: CSharpVisitorContext,
): TreeWalkAction<CSharpWalkState> | null {
  if (!CSHARP_TYPE_DECLARATIONS.has(node.type)) {
    return null;
  }

  const currentBaseTypePaths = handleCSharpTypeDeclaration(
    node,
    state,
    context.filePath,
    context.workspaceRoot,
    context.relations,
    context.symbols,
    context.usingNamespaces,
    context.importTargetsByNamespace,
    context.symbolsEnabled,
  );
  return {
    nextContext: {
      ...state,
      currentBaseTypePaths,
    },
  };
}

function visitCSharpNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
  context: CSharpVisitorContext,
): TreeWalkAction<CSharpWalkState> | void {
  if (node.type === 'namespace_declaration' || node.type === 'file_scoped_namespace_declaration') {
    return handleCSharpNamespaceNode(node, state, walk);
  }

  if (node.type === 'using_directive') {
    handleCSharpUsingDirective(node, context.usingNamespaces);
    return;
  }

  handleCSharpReferences(node, state, context);

  const typeAction = handleCSharpTypeNode(node, state, context);
  if (typeAction) {
    return typeAction;
  }

  const symbolAction = handleCSharpSymbolNode(node, state, walk, context);
  if (symbolAction) {
    return symbolAction;
  }

  collectCSharpUsingTargetNode(
    node,
    context.filePath,
    context.workspaceRoot,
    context.usingNamespaces,
    context.importTargetsByNamespace,
    state.currentNamespace,
  );
}

function handleCSharpSymbolNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
  context: CSharpVisitorContext,
): TreeWalkAction<CSharpWalkState> | void {
  if (!context.symbolsEnabled) {
    return;
  }

  const statefulHandler = CSHARP_STATEFUL_SYMBOL_HANDLERS[node.type];
  if (statefulHandler) {
    return statefulHandler(node, state, context.filePath, context.symbols, walk);
  }

  CSHARP_SIMPLE_SYMBOL_HANDLERS[node.type]?.(node, context.filePath, context.symbols);
}

function handleCSharpReferences(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  context: CSharpVisitorContext,
): void {
  handleCSharpTypeReferenceNode(
    node,
    context.filePath,
    context.workspaceRoot,
    context.relations,
    context.usingNamespaces,
    context.importTargetsByNamespace,
    state.currentNamespace,
  );
  handleCSharpCallNode(
    node,
    state,
    context.filePath,
    context.workspaceRoot,
    context.relations,
    context.usingNamespaces,
    context.importTargetsByNamespace,
  );
}

export function analyzeCSharpFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const symbolsEnabled = shouldIncludeTreeSitterSymbols(options);
  const usingNamespaces = new Set<string>();
  const importTargetsByNamespace = new Map<string, Set<string>>();
  walkTree(
    tree.rootNode,
    { currentNamespace: getCSharpFileScopedNamespaceName(tree.rootNode) },
    (node, state, walk) =>
      visitCSharpNode(
        node,
        state,
        walk,
        {
          filePath,
          workspaceRoot,
          relations,
          symbols,
          usingNamespaces,
          importTargetsByNamespace,
          symbolsEnabled,
        },
      ),
  );

  appendCSharpUsingImportRelations(
    workspaceRoot,
    filePath,
    relations,
    usingNamespaces,
    importTargetsByNamespace,
  );

  return normalizeAnalysisResult(filePath, symbols, relations);
}
