import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../../analyze/model';

export interface CppSymbolWalkState extends SymbolWalkState {
  currentClassName?: string;
  currentFunctionSymbolId?: string;
  suppressTypeDeclarationSymbol?: boolean;
}

export type CppSymbolHandler = (
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  state: CppSymbolWalkState,
) => TreeWalkAction<CppSymbolWalkState> | void;

export const CLASS_LIKE_NODE_TYPES = new Set([
  'class_specifier',
  'struct_specifier',
  'union_specifier',
]);
