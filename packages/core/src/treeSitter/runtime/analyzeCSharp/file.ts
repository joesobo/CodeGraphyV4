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
  handleCSharpMethodDeclaration,
  handleCSharpTypeDeclaration,
} from './declarations';
import type { CSharpWalkState } from './model';
import {
  appendCSharpUsingImportRelations,
  handleCSharpReferenceNode,
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
  'interface_declaration',
  'struct_declaration',
  'enum_declaration',
]);

function handleCSharpTypeNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  usingNamespaces: Set<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  symbolsEnabled: boolean,
): boolean {
  if (!symbolsEnabled || !CSHARP_TYPE_DECLARATIONS.has(node.type)) {
    return false;
  }

  handleCSharpTypeDeclaration(
    node,
    state,
    filePath,
    workspaceRoot,
    relations,
    symbols,
    usingNamespaces,
    importTargetsByNamespace,
  );
  return true;
}

function visitCSharpNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  usingNamespaces: Set<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  symbolsEnabled: boolean,
): TreeWalkAction<CSharpWalkState> | void {
  if (node.type === 'namespace_declaration' || node.type === 'file_scoped_namespace_declaration') {
    return handleCSharpNamespaceNode(node, state, walk);
  }

  if (node.type === 'using_directive') {
    handleCSharpUsingDirective(node, usingNamespaces);
    return;
  }

  if (
    handleCSharpTypeNode(
      node,
      state,
      filePath,
      workspaceRoot,
      relations,
      symbols,
      usingNamespaces,
      importTargetsByNamespace,
      symbolsEnabled,
    )
  ) {
    return;
  }

  if (node.type === 'method_declaration') {
    return symbolsEnabled
      ? handleCSharpMethodDeclaration(node, state, filePath, symbols, walk)
      : undefined;
  }

  handleCSharpReferenceNode(
    node,
    state,
    filePath,
    workspaceRoot,
    relations,
    usingNamespaces,
    importTargetsByNamespace,
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
        filePath,
        workspaceRoot,
        relations,
        symbols,
        usingNamespaces,
        importTargetsByNamespace,
        symbolsEnabled,
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
