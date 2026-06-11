import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol, createSymbolId } from '../analyze/results';
import { handleCFamilySymbol } from '../analyzeCFamily/symbols';

interface CppSymbolWalkState extends SymbolWalkState {
  currentClassName?: string;
  currentFunctionSymbolId?: string;
  suppressTypeDeclarationSymbol?: boolean;
}

const CLASS_LIKE_NODE_TYPES = new Set([
  'class_specifier',
  'struct_specifier',
  'union_specifier',
]);

const DECLARATOR_NODE_TYPES = new Set([
  'array_declarator',
  'field_identifier',
  'function_declarator',
  'identifier',
  'init_declarator',
  'pointer_declarator',
  'reference_declarator',
]);

const IDENTIFIER_NODE_TYPES = new Set([
  'field_identifier',
  'identifier',
  'namespace_identifier',
  'type_identifier',
]);

type CppSymbolHandler = (
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
) => TreeWalkAction<CppSymbolWalkState> | void;

const CPP_SYMBOL_HANDLERS: Readonly<Record<string, CppSymbolHandler>> = {
  alias_declaration: handleCppAliasDeclaration,
  class_specifier: handleCppTypeDeclaration,
  declaration: handleCppDeclaration,
  enum_specifier: handleCppCFamilySymbol,
  field_declaration: handleCppFieldDeclaration,
  for_range_loop: handleCppForRangeLoop,
  function_definition: handleCppFunctionDefinition,
  namespace_definition: handleCppCFamilySymbol,
  parameter_declaration: handleCppParameterDeclaration,
  struct_specifier: handleCppTypeDeclaration,
  template_declaration: handleCppTemplateDeclaration,
  union_specifier: handleCppTypeDeclaration,
};

export function handleCppSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  return CPP_SYMBOL_HANDLERS[node.type]?.(node, filePath, symbols, state);
}

function addNamedSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  nameNode: Parser.SyntaxNode | null,
  rangeNode: Parser.SyntaxNode,
  name = nameNode?.text,
  signature?: string,
): void {
  if (!nameNode || !name) {
    return;
  }

  symbols.push(createSymbol(filePath, kind, name, rangeNode, signature));
}

function handleCppAliasDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<CppSymbolWalkState> {
  addNamedSymbol(symbols, filePath, 'alias', getDeclarationNameNode(node), node);
  return { skipChildren: true };
}

function handleCppCFamilySymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<CppSymbolWalkState> | void {
  return handleCFamilySymbol(node, filePath, symbols) as TreeWalkAction<CppSymbolWalkState> | void;
}

function handleCppTemplateDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> {
  const declaration = node.namedChildren.find((child) => CLASS_LIKE_NODE_TYPES.has(child.type))
    ?? node.namedChildren.find((child) => child.type === 'function_definition' || child.type === 'declaration')
    ?? node.namedChildren.at(-1);
  const nameNode = declaration ? getDeclarationNameNode(declaration) : null;
  addNamedSymbol(symbols, filePath, 'template', nameNode, declaration ?? node);

  return {
    nextContext: {
      ...state,
      suppressTypeDeclarationSymbol: true,
    },
  };
}

function handleCppTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> {
  const nameNode = getDeclarationNameNode(node);
  const typeName = nameNode?.text;

  if (!state.suppressTypeDeclarationSymbol) {
    const kind = node.type === 'class_specifier'
      ? 'class'
      : node.type === 'union_specifier'
        ? 'union'
        : 'struct';
    addNamedSymbol(symbols, filePath, kind, nameNode, node);
  }

  return {
    nextContext: {
      ...state,
      currentClassName: typeName ?? state.currentClassName,
      suppressTypeDeclarationSymbol: false,
    },
  };
}

function handleCppFunctionDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  const nameNode = getFunctionNameNode(node);
  if (!nameNode) {
    return { skipChildren: true };
  }

  const name = qualifyCppFunctionName(node, nameNode.text, state.currentClassName);
  const kind = isCppMethodDefinition(node, state.currentClassName) ? 'method' : 'function';
  addNamedSymbol(symbols, filePath, kind, nameNode, node, name);

  return {
    nextContext: {
      ...state,
      currentFunctionSymbolId: createSymbolId(filePath, kind, name),
      currentSymbolId: createSymbolId(filePath, kind, name),
    },
  };
}

function handleCppDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (state.currentFunctionSymbolId) {
    for (const nameNode of getDeclaratorNameNodes(node)) {
      addNamedSymbol(symbols, filePath, 'local', nameNode, node);
    }
    return { skipChildren: true };
  }

  if (hasFunctionDeclarator(node)) {
    return { skipChildren: true };
  }

  if (isInsideClassLike(node)) {
    return;
  }

  const kind = isCppConstantDeclaration(node) ? 'constant' : 'global';
  for (const nameNode of getDeclaratorNameNodes(node)) {
    addNamedSymbol(symbols, filePath, kind, nameNode, node);
  }
  return { skipChildren: true };
}

function handleCppFieldDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (hasFunctionDeclarator(node)) {
    const nameNode = getFunctionNameNode(node);
    if (nameNode && state.currentClassName && isPureVirtualDeclaration(node)) {
      addNamedSymbol(symbols, filePath, 'method', nameNode, node, `${state.currentClassName}::${nameNode.text}`);
      addCppParameterSymbols(node, filePath, symbols);
    }
    return { skipChildren: true };
  }

  for (const nameNode of getDeclaratorNameNodes(node)) {
    addNamedSymbol(symbols, filePath, 'field', nameNode, node);
  }
  return { skipChildren: true };
}

function handleCppForRangeLoop(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): void {
  if (!state.currentFunctionSymbolId) {
    return;
  }

  addNamedSymbol(symbols, filePath, 'local', getForRangeLoopNameNode(node), node);
}

function getForRangeLoopNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  for (const child of node.namedChildren) {
    if (!isRangeLoopVariableDeclarator(child)) {
      continue;
    }

    const nameNode = getDeclaratorNameNode(child);
    if (nameNode?.text) {
      return nameNode;
    }
  }

  return null;
}

function isRangeLoopVariableDeclarator(node: Parser.SyntaxNode): boolean {
  return node.type === 'reference_declarator'
    || node.type === 'pointer_declarator'
    || node.type === 'identifier';
}

function handleCppParameterDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
): TreeWalkAction<CppSymbolWalkState> | void {
  if (!state.currentFunctionSymbolId) {
    return;
  }

  const nameNode = getDeclaratorNameNode(node);
  addNamedSymbol(symbols, filePath, 'parameter', nameNode, node, undefined, createRangeSignature(node));
  return { skipChildren: true };
}

function addCppParameterSymbols(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  for (const child of node.namedChildren) {
    if (child.type === 'parameter_declaration') {
      addNamedSymbol(
        symbols,
        filePath,
        'parameter',
        getDeclaratorNameNode(child),
        child,
        undefined,
        createRangeSignature(child),
      );
      continue;
    }

    addCppParameterSymbols(child, filePath, symbols);
  }
}

function createRangeSignature(node: Parser.SyntaxNode): string {
  return `${node.startPosition.row + 1}:${node.startPosition.column + 1}`;
}

function getDeclarationNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  return node.childForFieldName('name') ?? findDescendantByType(node, IDENTIFIER_NODE_TYPES);
}

function getFunctionNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const declarator = node.childForFieldName('declarator')
    ?? node.namedChildren.find((child) => child.type === 'function_declarator');

  return getDeclaratorNameNode(declarator);
}

function getDeclaratorNameNode(node: Parser.SyntaxNode | null | undefined): Parser.SyntaxNode | null {
  if (!node || isIgnoredDeclaratorNameNode(node)) {
    return null;
  }

  if (isDeclaratorIdentifierNode(node)) {
    return node;
  }

  return getQualifiedDeclaratorNameNode(node)
    ?? getNestedDeclaratorNameNode(node);
}

function isIgnoredDeclaratorNameNode(node: Parser.SyntaxNode): boolean {
  return node.type === 'destructor_name';
}

function isDeclaratorIdentifierNode(node: Parser.SyntaxNode): boolean {
  return node.type === 'field_identifier' || node.type === 'identifier';
}

function getQualifiedDeclaratorNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  if (node.type !== 'qualified_identifier') {
    return null;
  }

  return findLastDeclaratorNameNode(node.namedChildren);
}

function getNestedDeclaratorNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const declarator = node.childForFieldName('declarator');
  if (declarator) {
    return getDeclaratorNameNode(declarator);
  }

  return findFirstDeclaratorNameNode(node.namedChildren.filter((child) => child.type !== 'parameter_declaration'));
}

function findFirstDeclaratorNameNode(nodes: ReadonlyArray<Parser.SyntaxNode>): Parser.SyntaxNode | null {
  for (const child of nodes) {
    const match = getDeclaratorNameNode(child);
    if (match) {
      return match;
    }
  }

  return null;
}

function findLastDeclaratorNameNode(nodes: ReadonlyArray<Parser.SyntaxNode>): Parser.SyntaxNode | null {
  for (const child of [...nodes].reverse()) {
    const match = getDeclaratorNameNode(child);
    if (match) {
      return match;
    }
  }

  return null;
}

function getDeclaratorNameNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const declarators = node.namedChildren.filter((child) => DECLARATOR_NODE_TYPES.has(child.type));
  const explicitDeclarators = declarators.filter((child) => child.type !== 'identifier' && child.type !== 'field_identifier');
  const candidates = explicitDeclarators.length > 0
    ? explicitDeclarators
    : declarators.filter((child) => child.type === 'identifier' || child.type === 'field_identifier');

  return candidates
    .map((child) => getDeclaratorNameNode(child))
    .filter((nameNode): nameNode is Parser.SyntaxNode => Boolean(nameNode?.text));
}

function findDescendantByType(
  node: Parser.SyntaxNode | null | undefined,
  types: ReadonlySet<string>,
): Parser.SyntaxNode | null {
  const queue = node ? [node] : [];
  for (const candidate of queue) {
    if (types.has(candidate.type)) {
      return candidate;
    }

    queue.push(...candidate.namedChildren);
  }

  return null;
}

function hasFunctionDeclarator(node: Parser.SyntaxNode): boolean {
  return node.namedChildren.some((child) =>
    child.type === 'function_declarator' || hasFunctionDeclarator(child),
  );
}

function isCppConstantDeclaration(node: Parser.SyntaxNode): boolean {
  return /\b(?:const|constexpr)\b/.test(node.text.split(/[=;]/, 1)[0] ?? '');
}

function isCppMethodDefinition(node: Parser.SyntaxNode, currentClassName: string | undefined): boolean {
  if (currentClassName) {
    return true;
  }

  return Boolean(readQualifiedFunctionDeclaratorText(node));
}

function isPureVirtualDeclaration(node: Parser.SyntaxNode): boolean {
  return /=\s*0\s*;?$/.test(node.text.trim());
}

function isInsideClassLike(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (CLASS_LIKE_NODE_TYPES.has(current.type)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function qualifyCppFunctionName(
  node: Parser.SyntaxNode,
  functionName: string,
  currentClassName: string | undefined,
): string {
  if (currentClassName) {
    return `${currentClassName}::${functionName}`;
  }

  return readQualifiedFunctionDeclaratorText(node) ?? functionName;
}

function readQualifiedFunctionDeclaratorText(node: Parser.SyntaxNode): string | null {
  const functionDeclarator = findDescendantByType(node.childForFieldName('declarator'), new Set(['function_declarator']));
  const declarator = functionDeclarator?.childForFieldName('declarator');
  if (declarator?.type === 'qualified_identifier') {
    return declarator.text;
  }

  return null;
}

export type { CppSymbolWalkState };
