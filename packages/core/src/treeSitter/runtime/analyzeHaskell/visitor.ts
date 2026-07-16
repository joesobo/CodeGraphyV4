import type Parser from 'tree-sitter';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { visitHaskellBind } from './bindVisitor';
import { visitHaskellImport } from './importVisitor';
import {
  addHaskellPatternParameterSymbols,
  addHaskellRecordFieldSymbol,
  handleHaskellDeclaration,
  handleHaskellHeader,
} from './symbols';

export interface HaskellVisitContext {
  filePath: string;
  sourceRoot: string | null;
  relations: IAnalysisRelation[];
  symbols: IAnalysisSymbol[];
  importedCallablePaths: Map<string, string>;
  importedTypePaths: Map<string, string>;
  symbolsEnabled: boolean;
}

export function visitHaskellNode(
  node: Parser.SyntaxNode,
  context: HaskellVisitContext,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'header') return visitHaskellHeader(node, context);
  if (node.type === 'import') return visitHaskellImport(node, context);
  if (node.type === 'function' || node.type === 'bind') return visitHaskellBind(node, context);
  if (!context.symbolsEnabled) return;
  return visitHaskellSymbolNode(node, context);
}

function visitHaskellSymbolNode(node: Parser.SyntaxNode, context: HaskellVisitContext): void {
  if (node.type === 'field') {
    addHaskellRecordFieldSymbol(node, context.filePath, context.symbols);
  } else if (node.type === 'patterns') {
    addHaskellPatternParameterSymbols(node, context.filePath, context.symbols);
  } else {
    handleHaskellDeclaration(node, context.filePath, context.symbols);
  }
}

function visitHaskellHeader(node: Parser.SyntaxNode, context: HaskellVisitContext): void {
  if (context.symbolsEnabled) handleHaskellHeader(node, context.filePath, context.symbols);
}
