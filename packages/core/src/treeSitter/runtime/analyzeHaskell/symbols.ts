import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol } from '../analyze/results';

function addNamedSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  name: string | Parser.SyntaxNode | null | undefined,
  node?: Parser.SyntaxNode,
): void {
  const symbolName = typeof name === 'string' ? name : name?.text;
  if (symbolName) {
    symbols.push(createSymbol(filePath, kind, symbolName, node ?? name as Parser.SyntaxNode));
  }
}

export function handleHaskellHeader(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addNamedSymbol(symbols, filePath, 'module', node.childForFieldName('module')?.text, node);
}

function addSkippingDeclarationSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  kind: string,
): TreeWalkAction<SymbolWalkState> {
  addNamedSymbol(symbols, filePath, kind, node.childForFieldName('name')?.text, node);
  return { skipChildren: true };
}

function addDeclarationSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  kind: string,
): void {
  addNamedSymbol(symbols, filePath, kind, node.childForFieldName('name'), node);
}

function addClassDeclarationSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addNamedSymbol(symbols, filePath, 'class', node.childForFieldName('name')?.text, node);
}

export function handleHaskellDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'data_type':
      addDeclarationSymbol(node, filePath, symbols, 'type');
      return;
    case 'newtype':
      return addSkippingDeclarationSymbol(node, filePath, symbols, 'type');
    case 'type_synonym':
      return addSkippingDeclarationSymbol(node, filePath, symbols, 'type');
    case 'class':
      addClassDeclarationSymbol(node, filePath, symbols);
      return;
    case 'function':
      addDeclarationSymbol(node, filePath, symbols, 'function');
      return;
    default:
      return;
  }
}

export function addHaskellRecordFieldSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addNamedSymbol(symbols, filePath, 'field', node.childForFieldName('name'), node);
}

export function addHaskellPatternParameterSymbols(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  for (const child of node.namedChildren) {
    if (child.type === 'variable') {
      addNamedSymbol(symbols, filePath, 'parameter', child, child);
    }
  }
}

export function addHaskellTopLevelBindSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): 'constant' | 'function' | undefined {
  const nameNode = node.childForFieldName('name');
  if (!nameNode) {
    return undefined;
  }

  const kind = nameNode.text === 'main' ? 'function' : 'constant';
  addNamedSymbol(symbols, filePath, kind, nameNode, node);
  return kind;
}

export function addHaskellLocalBindSymbols(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const nameNode = node.childForFieldName('name');
  if (nameNode) {
    addNamedSymbol(symbols, filePath, 'local', nameNode, node);
    return;
  }

  const patternNode = node.childForFieldName('pattern');
  for (const variableNode of patternNode?.descendantsOfType('variable') ?? []) {
    addNamedSymbol(symbols, filePath, 'local', variableNode, variableNode);
  }
}
