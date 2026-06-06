import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { CSharpWalkState } from './model';
import { getCSharpTypeName, resolveCSharpUsingImport } from './resolution';
import { getIdentifierText } from '../analyze/nodes';
export { appendCSharpUsingImportRelations } from './usingImports';
import { addCallRelation, addReferenceRelation } from '../analyze/results';
import type { ImportedBinding } from '../analyze/model';

export function handleCSharpReferenceNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  if (node.type !== 'member_access_expression' && node.type !== 'object_creation_expression') {
    return;
  }

  const typeName = node.type === 'member_access_expression'
    ? getIdentifierText(node.childForFieldName('expression') ?? node.namedChildren[0])
    : getCSharpTypeName(node.childForFieldName('type'));
  if (!typeName || !/^[A-Z]/u.test(typeName)) {
    return;
  }

  const resolvedPath = resolveCSharpUsingImport(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    typeName,
    state.currentNamespace,
  );
  if (resolvedPath) {
    addReferenceRelation(
      relations,
      filePath,
      typeName,
      resolvedPath,
      state.currentSymbolId,
    );
  }
}

export function handleCSharpCallNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  const binding = getCSharpCallBinding(
    node,
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    state.currentNamespace,
    state.currentBaseTypePaths ?? [],
  );
  if (binding) {
    addCallRelation(relations, filePath, binding, state.currentSymbolId);
  }
}

function getCSharpCallBinding(
  node: Parser.SyntaxNode,
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  currentNamespace: string | null,
  currentBaseTypePaths: readonly string[],
): ImportedBinding | null {
  if (node.type === 'object_creation_expression') {
    const typeName = getCSharpTypeName(node.childForFieldName('type') ?? node.namedChildren[0]);
    return createCSharpCallBinding(
      workspaceRoot,
      filePath,
      usingNamespaces,
      importTargetsByNamespace,
      currentNamespace,
      typeName,
    );
  }

  if (node.type !== 'invocation_expression') {
    return null;
  }

  const functionNode = node.childForFieldName('function') ?? node.namedChildren[0];
  if (!functionNode) {
    return null;
  }

  if (functionNode.type !== 'member_access_expression') {
    const methodName = getIdentifierText(functionNode);
    if (!methodName || currentBaseTypePaths.length !== 1) {
      return null;
    }

    return createInheritedCSharpCallBinding(methodName, currentBaseTypePaths[0]);
  }

  const typeName = getIdentifierText(functionNode.childForFieldName('expression') ?? functionNode.namedChildren[0]);
  const memberName = getIdentifierText(functionNode.childForFieldName('name') ?? functionNode.namedChildren.at(-1));
  return createCSharpCallBinding(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    currentNamespace,
    typeName,
    memberName ?? undefined,
  );
}

function createCSharpCallBinding(
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  currentNamespace: string | null,
  typeName: string | null,
  memberName?: string,
): ImportedBinding | null {
  if (!typeName || !/^[A-Z]/u.test(typeName)) {
    return null;
  }

  const resolvedPath = resolveCSharpUsingImport(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    typeName,
    currentNamespace,
  );
  if (!resolvedPath) {
    return null;
  }

  return {
    importedName: typeName,
    localName: typeName,
    memberName,
    resolvedPath,
    specifier: typeName,
  };
}

function createInheritedCSharpCallBinding(methodName: string, resolvedPath: string): ImportedBinding {
  return {
    importedName: methodName,
    localName: methodName,
    resolvedPath,
    specifier: methodName,
  };
}
