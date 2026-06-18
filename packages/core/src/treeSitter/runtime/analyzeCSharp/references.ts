import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { CSharpWalkState } from './model';
import { getCSharpTypeName, resolveCSharpUsingImport } from './resolution';
import { resolveCSharpInheritedMethodPath } from '../csharpIndex';
import { getIdentifierText } from '../analyze/nodes';
export { appendCSharpUsingImportRelations } from './usingImports';
import {
  addRelation,
  createSymbolId,
} from '../analyze/results';
import type { ImportedBinding } from '../analyze/model';
import { TREE_SITTER_SOURCE_IDS } from '../languages';

const CSHARP_PARAMETER_HOSTS = new Set([
  'constructor_declaration',
  'delegate_declaration',
  'local_function_statement',
  'method_declaration',
  'record_declaration',
]);

type CSharpReferenceContext = {
  filePath: string;
  workspaceRoot: string;
  relations: IAnalysisRelation[];
  usingNamespaces: ReadonlySet<string>;
  importTargetsByNamespace: Map<string, Set<string>>;
  currentNamespace: string | null;
};

type CSharpTypeReferenceHandler = (
  node: Parser.SyntaxNode,
  context: CSharpReferenceContext,
) => void;

const CSHARP_TYPE_REFERENCE_HANDLERS: Record<string, CSharpTypeReferenceHandler> = {
  constructor_declaration: addCSharpParameterTypeReferences,
  event_field_declaration: (node, context) => addCSharpVariableTypeReferences(node, context, 'event'),
  field_declaration: (node, context) =>
    addCSharpVariableTypeReferences(node, context, getCSharpFieldReferenceSymbolKind(node)),
  local_declaration_statement: (node, context) =>
    addCSharpVariableTypeReferences(node, context, getCSharpLocalReferenceSymbolKind(node)),
  local_function_statement: (node, context) => addCSharpCallableTypeReferences(node, context, 'method'),
  method_declaration: (node, context) => addCSharpCallableTypeReferences(node, context, 'method'),
  parameter: handleCSharpParameterTypeReferenceNode,
  property_declaration: (node, context) => addCSharpNamedTypeReference(node, context, 'property'),
};

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
    addCSharpCallRelation(relations, filePath, binding, state.currentSymbolId);
  }
}

export function collectCSharpUsingTargetNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  currentNamespace: string | null,
): void {
  if (node.type !== 'member_access_expression') {
    return;
  }

  const typeName = getIdentifierText(node.childForFieldName('expression') ?? node.namedChildren[0]);
  if (!typeName || !/^[A-Z]/u.test(typeName)) {
    return;
  }

  resolveCSharpUsingImport(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    typeName,
    currentNamespace,
  );
}

export function handleCSharpTypeReferenceNode(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  currentNamespace: string | null,
): void {
  const context = {
    filePath,
    workspaceRoot,
    relations,
    usingNamespaces,
    importTargetsByNamespace,
    currentNamespace,
  };
  CSHARP_TYPE_REFERENCE_HANDLERS[node.type]?.(node, context);
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
    return createCSharpObjectCreationCallBinding(
      node,
      workspaceRoot,
      filePath,
      usingNamespaces,
      importTargetsByNamespace,
      currentNamespace,
    );
  }

  if (node.type !== 'invocation_expression') {
    return null;
  }

  const functionNode = node.childForFieldName('function') ?? node.namedChildren[0];
  if (!functionNode) {
    return null;
  }

  return functionNode.type === 'member_access_expression'
    ? getCSharpMemberAccessCallBinding(
      node,
      functionNode,
      workspaceRoot,
      filePath,
      usingNamespaces,
      importTargetsByNamespace,
      currentNamespace,
    )
    : getCSharpUnqualifiedCallBinding(
      node,
      functionNode,
      filePath,
      workspaceRoot,
      currentBaseTypePaths,
    );
}

function createCSharpObjectCreationCallBinding(
  node: Parser.SyntaxNode,
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  currentNamespace: string | null,
): ImportedBinding | null {
  return createCSharpCallBinding(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    currentNamespace,
    getCSharpTypeName(node.childForFieldName('type') ?? node.namedChildren[0]),
  );
}

function getCSharpUnqualifiedCallBinding(
  node: Parser.SyntaxNode,
  functionNode: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  currentBaseTypePaths: readonly string[],
): ImportedBinding | null {
  const methodName = getIdentifierText(functionNode);
  if (!methodName) {
    return null;
  }

  if (hasCSharpLocalFunction(node, methodName)) {
    return createCSharpMethodCallBinding(methodName, filePath);
  }

  const inheritedMethodPath = resolveCSharpInheritedMethodPath(
    workspaceRoot,
    currentBaseTypePaths,
    methodName,
  );
  return inheritedMethodPath
    ? createInheritedCSharpCallBinding(methodName, inheritedMethodPath)
    : null;
}

function getCSharpMemberAccessCallBinding(
  node: Parser.SyntaxNode,
  functionNode: Parser.SyntaxNode,
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  currentNamespace: string | null,
): ImportedBinding | null {
  const receiverName = getIdentifierText(functionNode.childForFieldName('expression') ?? functionNode.namedChildren[0]);
  const memberName = getIdentifierText(functionNode.childForFieldName('name') ?? functionNode.namedChildren.at(-1));
  const typeName = readCSharpMemberReceiverTypeName(node, receiverName);
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

function readCSharpMemberReceiverTypeName(
  node: Parser.SyntaxNode,
  receiverName: string | null,
): string | null {
  return receiverName && /^[A-Z]/u.test(receiverName)
    ? receiverName
    : getCSharpReceiverTypeName(node, receiverName);
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

function createCSharpMethodCallBinding(methodName: string, resolvedPath: string): ImportedBinding {
  return {
    importedName: methodName,
    localName: methodName,
    memberName: methodName,
    resolvedPath,
    specifier: methodName,
  };
}

function addCSharpCallableTypeReferences(
  node: Parser.SyntaxNode,
  context: CSharpReferenceContext,
  symbolKind: string,
): void {
  addCSharpNamedTypeReference(node, context, symbolKind);
  addCSharpParameterTypeReferences(node, context);
}

function addCSharpNamedTypeReference(
  node: Parser.SyntaxNode,
  context: CSharpReferenceContext,
  symbolKind: string,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  addCSharpResolvedTypeRelations(
    context,
    getCSharpDeclarationTypeNode(node),
    createSymbolId(context.filePath, symbolKind, name),
  );
}

function addCSharpParameterTypeReferences(
  node: Parser.SyntaxNode,
  context: CSharpReferenceContext,
): void {
  for (const parameter of getCSharpDirectParameters(node)) {
    addCSharpParameterTypeReference(parameter, context);
  }
}

function addCSharpParameterTypeReference(
  node: Parser.SyntaxNode,
  context: CSharpReferenceContext,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  addCSharpResolvedTypeRelations(
    context,
    node.childForFieldName('type') ?? node.namedChildren[0],
    createSymbolId(context.filePath, 'parameter', name),
  );
}

function handleCSharpParameterTypeReferenceNode(
  node: Parser.SyntaxNode,
  context: CSharpReferenceContext,
): void {
  if (CSHARP_PARAMETER_HOSTS.has(getCSharpParameterHostType(node))) {
    addCSharpParameterTypeReference(node, context);
  }
}

function getCSharpFieldReferenceSymbolKind(node: Parser.SyntaxNode): 'constant' | 'field' {
  return /\bconst\b/u.test(node.text) ? 'constant' : 'field';
}

function getCSharpLocalReferenceSymbolKind(node: Parser.SyntaxNode): 'constant' | 'local' {
  return /\bconst\b/u.test(node.text) ? 'constant' : 'local';
}

function addCSharpVariableTypeReferences(
  node: Parser.SyntaxNode,
  context: CSharpReferenceContext,
  symbolKind: string,
): void {
  const variableDeclaration = node.namedChildren.find((child) => child.type === 'variable_declaration') ?? node;
  const typeNode = variableDeclaration.childForFieldName('type') ?? variableDeclaration.namedChildren[0];
  for (const declarator of variableDeclaration.descendantsOfType('variable_declarator')) {
    const name = getIdentifierText(declarator.childForFieldName('name'));
    if (!name) {
      continue;
    }

    addCSharpResolvedTypeRelations(
      context,
      typeNode,
      createSymbolId(context.filePath, symbolKind, name),
    );
  }
}

function getCSharpDirectParameters(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return node.namedChildren
    .find((child) => child.type === 'parameter_list')
    ?.namedChildren
    .filter((child) => child.type === 'parameter')
    ?? [];
}

function getCSharpDeclarationTypeNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const typeField = node.childForFieldName('type');
  if (typeField) {
    return typeField;
  }

  const nameNode = node.childForFieldName('name');
  const nameIndex = nameNode
    ? node.namedChildren.findIndex((child) => child.id === nameNode.id)
    : -1;
  if (nameIndex < 1) {
    return null;
  }

  return [...node.namedChildren.slice(0, nameIndex)]
    .reverse()
    .find((child) => child.type !== 'modifier')
    ?? null;
}

function getCSharpParameterHostType(node: Parser.SyntaxNode): string {
  return node.parent?.type === 'parameter_list'
    ? node.parent.parent?.type ?? ''
    : node.parent?.type ?? '';
}

function addCSharpResolvedTypeRelations(
  context: CSharpReferenceContext,
  typeNode: Parser.SyntaxNode | null | undefined,
  fromSymbolId?: string,
): void {
  for (const typeName of getCSharpTypeReferenceNames(typeNode)) {
    const resolvedPath = resolveCSharpUsingImport(
      context.workspaceRoot,
      context.filePath,
      context.usingNamespaces,
      context.importTargetsByNamespace,
      typeName,
      context.currentNamespace,
    );
    if (!resolvedPath) {
      continue;
    }

    addCSharpTypeRelation(context.relations, context.filePath, typeName, resolvedPath, fromSymbolId);
  }
}

function getCSharpTypeReferenceNames(typeNode: Parser.SyntaxNode | null | undefined): string[] {
  if (!typeNode) {
    return [];
  }

  const names = new Set<string>();
  const directName = getCSharpTypeName(typeNode);
  if (directName && /^[A-Z]/u.test(directName)) {
    names.add(directName);
  }

  for (const child of typeNode.descendantsOfType(['identifier', 'qualified_name'])) {
    const name = getCSharpTypeName(child);
    if (name && /^[A-Z]/u.test(name)) {
      names.add(name);
    }
  }

  return [...names];
}

function hasCSharpLocalFunction(node: Parser.SyntaxNode, methodName: string): boolean {
  const method = findCSharpAncestor(node, (ancestor) =>
    ancestor.type === 'method_declaration' || ancestor.type === 'local_function_statement',
  );
  if (!method) {
    return false;
  }

  return method.descendantsOfType('local_function_statement').some((localFunction) =>
    getIdentifierText(localFunction.childForFieldName('name')) === methodName,
  );
}

function getCSharpReceiverTypeName(
  node: Parser.SyntaxNode,
  receiverName: string | null,
): string | null {
  if (!receiverName) {
    return null;
  }

  const root = getCSharpRootNode(node);
  const parameterType = getCSharpParameterReceiverTypeName(root, receiverName);
  if (parameterType) {
    return parameterType;
  }

  for (const declarator of root.descendantsOfType('variable_declarator')) {
    const variableType = getCSharpVariableReceiverTypeName(declarator, receiverName);
    if (variableType) {
      return variableType;
    }
  }

  return null;
}

function getCSharpParameterReceiverTypeName(
  root: Parser.SyntaxNode,
  receiverName: string,
): string | null {
  for (const parameter of root.descendantsOfType('parameter')) {
    if (getIdentifierText(parameter.childForFieldName('name')) === receiverName) {
      return getCSharpTypeReferenceNames(parameter.childForFieldName('type') ?? parameter.namedChildren[0])[0] ?? null;
    }
  }

  return null;
}

function getCSharpVariableReceiverTypeName(
  declarator: Parser.SyntaxNode,
  receiverName: string,
): string | null {
  if (getIdentifierText(declarator.childForFieldName('name')) !== receiverName) {
    return null;
  }

  return getCSharpExplicitVariableReceiverTypeName(declarator)
    ?? getCSharpCreatedVariableReceiverTypeName(declarator);
}

function getCSharpExplicitVariableReceiverTypeName(declarator: Parser.SyntaxNode): string | null {
  const variableDeclaration = findCSharpAncestor(declarator, (ancestor) => ancestor.type === 'variable_declaration');
  const explicitType = getCSharpTypeReferenceNames(
    variableDeclaration?.childForFieldName('type') ?? variableDeclaration?.namedChildren[0],
  )[0];
  return explicitType && explicitType !== 'Var' ? explicitType : null;
}

function getCSharpCreatedVariableReceiverTypeName(declarator: Parser.SyntaxNode): string | null {
  return declarator.descendantsOfType('object_creation_expression')
    .map((creation) => getCSharpTypeName(creation.childForFieldName('type') ?? creation.namedChildren[0]))
    .find((name): name is string => Boolean(name && /^[A-Z]/u.test(name)))
    ?? null;
}

function getCSharpRootNode(node: Parser.SyntaxNode): Parser.SyntaxNode {
  let current: Parser.SyntaxNode = node;
  while (current.parent) {
    current = current.parent;
  }
  return current;
}

function findCSharpAncestor(
  node: Parser.SyntaxNode,
  predicate: (ancestor: Parser.SyntaxNode) => boolean,
): Parser.SyntaxNode | null {
  let current = node.parent;
  while (current) {
    if (predicate(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function addCSharpTypeRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    kind: 'type',
    sourceId: TREE_SITTER_SOURCE_IDS.type,
    fromFilePath: filePath,
    fromSymbolId,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}

function addCSharpCallRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  binding: ImportedBinding,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    kind: 'call',
    sourceId: TREE_SITTER_SOURCE_IDS.call,
    fromFilePath: filePath,
    fromSymbolId,
    specifier: binding.specifier,
    resolvedPath: binding.resolvedPath,
    toFilePath: binding.resolvedPath,
    metadata: {
      bindingKind: binding.bindingKind ?? null,
      importedName: binding.importedName ?? null,
      localName: binding.localName ?? null,
      memberName: binding.memberName ?? null,
    },
  });
}
