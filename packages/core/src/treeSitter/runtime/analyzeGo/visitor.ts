import type Parser from 'tree-sitter';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { handleGoImportDeclaration } from './imports';
import {
  handleGoCallableDeclaration,
  handleGoConstSpec,
  handleGoShortVarDeclaration,
  handleGoTypeSpec,
  handleGoTypeSpecRelations,
} from './handlers';
import { visitGoReferenceNode } from './references';

export interface GoVisitContext {
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void;
  filePath: string;
  workspaceRoot: string;
  relations: IAnalysisRelation[];
  symbols: IAnalysisSymbol[];
  importedBindings: Map<string, ImportedBinding>;
  receiverBindings: Map<string, ImportedBinding>;
  symbolsEnabled: boolean;
}

export function visitGoNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  context: GoVisitContext,
): TreeWalkAction<SymbolWalkState> | void {
  if (node.type === 'import_declaration') {
    return handleGoImportDeclaration(node, context.filePath, context.workspaceRoot, context.relations, context.importedBindings);
  }
  if (node.type === 'function_declaration' || node.type === 'method_declaration') {
    return context.symbolsEnabled
      ? handleGoCallableDeclaration(node, context.filePath, context.symbols, context.walk)
      : undefined;
  }
  if (visitGoDataDeclaration(node, context)) return;
  visitGoReferenceNode(node, state, context.filePath, context.relations, context.importedBindings, context.receiverBindings);
}

function visitGoDataDeclaration(node: Parser.SyntaxNode, context: GoVisitContext): boolean {
  if (node.type === 'type_spec') {
    if (context.symbolsEnabled) {
      handleGoTypeSpec(node, context.filePath, context.symbols, context.relations, context.importedBindings, {
        includeSymbolEndpoint: true,
      });
    } else {
      handleGoTypeSpecRelations(node, context.filePath, context.relations, context.importedBindings);
    }
    return true;
  }
  if (node.type === 'const_spec') {
    if (context.symbolsEnabled) handleGoConstSpec(node, context.filePath, context.symbols);
    return true;
  }
  if (node.type !== 'short_var_declaration') return false;
  handleGoShortVarDeclaration(
    node,
    context.filePath,
    context.symbols,
    context.importedBindings,
    context.receiverBindings,
    { includeSymbols: context.symbolsEnabled },
  );
  return true;
}
