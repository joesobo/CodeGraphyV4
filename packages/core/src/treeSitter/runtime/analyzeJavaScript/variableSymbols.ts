import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { getVariableAssignedFunctionSymbol } from '../analyze/imports';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol } from '../analyze/results';
import { getJavaScriptDeclarationName } from './declarationNames';

export function handleJavaScriptVariableDeclarator(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> | void {
  const symbol = getVariableAssignedFunctionSymbol(node, filePath);
  if (symbol) {
    symbols.push(symbol);
    const valueNode = node.childForFieldName('value') ?? node.namedChildren.at(-1);
    const body = valueNode?.childForFieldName('body') ?? valueNode?.namedChildren.at(-1);
    if (body) {
      walk(body, { currentSymbolId: symbol.id });
    }

    return { skipChildren: true };
  }

  const name = getJavaScriptDeclarationName(node);
  if (!name) {
    return;
  }

  symbols.push(createSymbol(filePath, 'constant', name, node));
}
