import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../../core/plugins/types/contracts';
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
import type { TreeWalkAction } from '../model';
import { getCSharpFileScopedNamespaceName } from './namespaceNames';
import { normalizeAnalysisResult } from '../results';
import { walkTree } from '../walk';

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
): TreeWalkAction<CSharpWalkState> | void {
  if (node.type === 'namespace_declaration' || node.type === 'file_scoped_namespace_declaration') {
    return handleCSharpNamespaceNode(node, state, walk);
  }

  if (node.type === 'using_directive') {
    handleCSharpUsingDirective(node, usingNamespaces);
    return;
  }

  if (
    node.type === 'class_declaration'
    || node.type === 'interface_declaration'
    || node.type === 'struct_declaration'
    || node.type === 'enum_declaration'
  ) {
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
    return;
  }

  if (node.type === 'method_declaration') {
    return handleCSharpMethodDeclaration(node, state, filePath, symbols, walk);
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
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
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
