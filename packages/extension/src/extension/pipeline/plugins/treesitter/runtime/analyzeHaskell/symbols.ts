import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '../../../../../../core/plugins/types/contracts';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol } from '../analyze/results';

function addNamedSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  name: string | null | undefined,
  node: Parser.SyntaxNode,
): void {
  if (name) {
    symbols.push(createSymbol(filePath, kind, name, node));
  }
}

export function handleHaskellHeader(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  addNamedSymbol(symbols, filePath, 'module', node.childForFieldName('module')?.text, node);
}

export function handleHaskellDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'data_type': {
      addNamedSymbol(symbols, filePath, 'data', node.childForFieldName('name')?.text, node);
      return { skipChildren: true };
    }
    case 'newtype': {
      addNamedSymbol(symbols, filePath, 'newtype', node.childForFieldName('name')?.text, node);
      return { skipChildren: true };
    }
    case 'type_synonym': {
      addNamedSymbol(symbols, filePath, 'type', node.childForFieldName('name')?.text, node);
      return { skipChildren: true };
    }
    case 'class': {
      addNamedSymbol(symbols, filePath, 'class', node.childForFieldName('name')?.text, node);
      return;
    }
    case 'function': {
      addNamedSymbol(symbols, filePath, 'function', node.childForFieldName('name')?.text, node);
      return { skipChildren: true };
    }
    default:
      return;
  }
}
