import type Parser from 'tree-sitter';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { addInheritRelation, createSymbol } from '../analyze/results';
import { walkSymbolBody } from '../analyze/walk';
import {
  getJavaScriptDeclarationName,
  getJavaScriptTypeDeclarationKind,
} from './declarationNames';
export { handleJavaScriptVariableDeclarator } from './variableSymbols';

export function handleJavaScriptFunctionDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getJavaScriptDeclarationName(node);
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'function', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

export function handleJavaScriptClassDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  symbolsEnabled: boolean,
): void {
  const name = getJavaScriptDeclarationName(node);
  if (!name) {
    return;
  }

  const symbol = symbolsEnabled ? createSymbol(filePath, 'class', name, node) : undefined;
  if (symbol) {
    symbols.push(symbol);
  }
  addJavaScriptInheritanceRelations(node.text, filePath, symbol?.id, relations, importedBindings);
}

export function handleJavaScriptTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  symbolsEnabled: boolean,
): void {
  const name = getJavaScriptDeclarationName(node);
  if (!name) {
    return;
  }

  const kind = getJavaScriptTypeDeclarationKind(node);
  const symbol = symbolsEnabled ? createSymbol(filePath, kind, name, node) : undefined;
  if (symbol) {
    symbols.push(symbol);
  }

  if (node.type === 'interface_declaration') {
    addJavaScriptInheritanceRelations(node.text, filePath, symbol?.id, relations, importedBindings);
  }
}

export function handleJavaScriptMethodDefinition(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const name = getJavaScriptDeclarationName(node);
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  return walkSymbolBody(node, symbol.id, walk);
}

function addJavaScriptInheritanceRelations(
  source: string,
  filePath: string,
  fromSymbolId: string | undefined,
  relations: IAnalysisRelation[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): void {
  const names = [
    ...readSingleClauseNames(source, /\bextends\s+([A-Za-z_$][\w$]*)/g),
    ...readListClauseNames(source, /\bimplements\s+([^{]+)/g),
  ];

  for (const typeName of new Set(names)) {
    const binding = importedBindings.get(typeName);
    addInheritRelation(relations, filePath, typeName, binding?.resolvedPath ?? null, fromSymbolId);
  }
}

function readSingleClauseNames(source: string, pattern: RegExp): string[] {
  return Array.from(source.matchAll(pattern), match => match[1]).filter(Boolean);
}

function readListClauseNames(source: string, pattern: RegExp): string[] {
  return Array.from(source.matchAll(pattern))
    .flatMap(match => match[1].split(','))
    .map(readLeadingTypeName)
    .filter((name): name is string => Boolean(name));
}

function readLeadingTypeName(value: string): string | null {
  return value.trim().match(/^([A-Za-z_$][\w$]*)/)?.[1] ?? null;
}
