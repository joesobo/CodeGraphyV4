import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { CSharpWalkState } from './model';
import type { TreeWalkAction } from '../analyze/model';
import { getCSharpTypeDeclarationKind, resolveCSharpUsingType } from './resolution';
import { getIdentifierText } from '../analyze/nodes';
import { addInheritRelation, addRelation, createSymbol } from '../analyze/results';
import { TREE_SITTER_SOURCE_IDS } from '../languages';

const CSHARP_PARAMETER_HOSTS = new Set([
  'constructor_declaration',
  'delegate_declaration',
  'local_function_statement',
  'method_declaration',
  'record_declaration',
]);

export function handleCSharpTypeDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  symbolsEnabled: boolean,
): string[] {
  const name = getIdentifierText(node.childForFieldName('name'));
  const symbol = name && symbolsEnabled
    ? createSymbol(filePath, getCSharpTypeDeclarationKind(node), name, node)
    : null;
  if (symbol) {
    symbols.push(symbol);
  }

  if (node.type === 'enum_declaration') {
    return [];
  }

  const resolvedBaseTypePaths: string[] = [];
  for (const baseType of node.descendantsOfType(['identifier', 'qualified_name'])) {
    addCSharpBaseTypeRelation(
      baseType,
      state,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
      symbol?.id,
      resolvedBaseTypePaths,
    );
  }
  return resolvedBaseTypePaths;
}

function addCSharpBaseTypeRelation(
  baseType: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  fromSymbolId: string | undefined,
  resolvedBaseTypePaths: string[],
): void {
  if (baseType.parent?.type !== 'base_list') {
    return;
  }

  const resolvedType = resolveCSharpUsingType(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    baseType.text,
    state.currentNamespace,
  );
  if (resolvedType?.kind === 'class') {
    resolvedBaseTypePaths.push(resolvedType.filePath);
  }

  addCSharpBaseTypeKindRelation(relations, filePath, baseType.text, resolvedType, fromSymbolId);
}

function addCSharpBaseTypeKindRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedType: ReturnType<typeof resolveCSharpUsingType>,
  fromSymbolId: string | undefined,
): void {
  if (resolvedType?.kind === 'interface') {
    addCSharpImplementsRelation(relations, filePath, specifier, resolvedType.filePath, fromSymbolId);
    return;
  }

  addInheritRelation(relations, filePath, specifier, resolvedType?.filePath ?? null, fromSymbolId);
}

export function handleCSharpMethodDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
): TreeWalkAction<CSharpWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  if (isCSharpInterfaceMember(node)) {
    for (const parameter of getCSharpDirectParameters(node)) {
      addCSharpParameterSymbol(parameter, filePath, symbols);
    }
    return { skipChildren: true };
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  for (const parameter of getCSharpDirectParameters(node)) {
    addCSharpParameterSymbol(parameter, filePath, symbols);
  }

  const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
  if (body) {
    walk(body, {
      ...state,
      currentSymbolId: symbol.id,
    });
  }

  return { skipChildren: true };
}

export function handleCSharpConstructorDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
): TreeWalkAction<CSharpWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'constructor', name, node);
  symbols.push(symbol);
  for (const parameter of getCSharpDirectParameters(node)) {
    addCSharpParameterSymbol(parameter, filePath, symbols);
  }

  const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
  if (body) {
    walk(body, {
      ...state,
      currentSymbolId: symbol.id,
    });
  }

  return { skipChildren: true };
}

export function handleCSharpLocalFunctionDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
): TreeWalkAction<CSharpWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  for (const parameter of getCSharpDirectParameters(node)) {
    addCSharpParameterSymbol(parameter, filePath, symbols);
  }

  const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
  if (body) {
    walk(body, {
      ...state,
      currentSymbolId: symbol.id,
    });
  }

  return { skipChildren: true };
}

export function handleCSharpPropertyDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addCSharpNamedSymbol(node, filePath, symbols, 'property');
}

export function handleCSharpEventFieldDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addCSharpVariableDeclarationSymbols(node, filePath, symbols, 'event');
}

export function handleCSharpFieldDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addCSharpVariableDeclarationSymbols(
    node,
    filePath,
    symbols,
    /\bconst\b/u.test(node.text) ? 'constant' : 'field',
  );
}

export function handleCSharpLocalDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addCSharpVariableDeclarationSymbols(
    node,
    filePath,
    symbols,
    /\bconst\b/u.test(node.text) ? 'constant' : 'local',
  );
}

export function handleCSharpParameter(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  if (!CSHARP_PARAMETER_HOSTS.has(getCSharpParameterHostType(node))) {
    return;
  }

  addCSharpParameterSymbol(node, filePath, symbols);
}

function addCSharpNamedSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  kind: string,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }
}

function addCSharpParameterSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addCSharpNamedSymbol(node, filePath, symbols, 'parameter');
}

function addCSharpVariableDeclarationSymbols(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  kind: string,
): void {
  for (const declarator of node.descendantsOfType('variable_declarator')) {
    const name = getIdentifierText(declarator.childForFieldName('name'));
    if (name) {
      symbols.push(createSymbol(filePath, kind, name, declarator));
    }
  }
}

function getCSharpDirectParameters(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return node.namedChildren
    .find((child) => child.type === 'parameter_list')
    ?.namedChildren
    .filter((child) => child.type === 'parameter')
    ?? [];
}

function getCSharpParameterHostType(node: Parser.SyntaxNode): string {
  return node.parent?.type === 'parameter_list'
    ? node.parent.parent?.type ?? ''
    : node.parent?.type ?? '';
}

function isCSharpInterfaceMember(node: Parser.SyntaxNode): boolean {
  return node.parent?.parent?.type === 'interface_declaration';
}

function addCSharpImplementsRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    kind: 'implements',
    sourceId: TREE_SITTER_SOURCE_IDS.implements,
    fromFilePath: filePath,
    ...(fromSymbolId ? { fromSymbolId } : {}),
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}
