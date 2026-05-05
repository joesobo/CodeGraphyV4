import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '../../../../../../core/plugins/types/contracts';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';

export interface CFamilySymbolContext {
  filePath: string;
  node: Parser.SyntaxNode;
  symbols: IAnalysisSymbol[];
}

export type CFamilySymbolHandler = (
  context: CFamilySymbolContext
) => TreeWalkAction<SymbolWalkState> | void;
