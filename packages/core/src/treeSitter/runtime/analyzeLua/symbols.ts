import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { createSymbol } from '../analyze/results';

function getLuaFunctionName(node: Parser.SyntaxNode): string | null {
  return node.childForFieldName('name')?.text ?? null;
}

export function handleLuaVariableDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): void {
  const assignment = node.namedChildren.find((child) => child.type === 'assignment_statement');
  const variableName = assignment
    ?.descendantsOfType('variable_list')[0]
    ?.descendantsOfType('identifier')[0]
    ?.text;
  const hasTableConstructor = Boolean(assignment?.descendantsOfType('table_constructor')[0]);
  if (variableName && hasTableConstructor) {
    symbols.push(createSymbol(filePath, 'table', variableName, node));
  }
}

export function handleLuaFunctionDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  symbols: IAnalysisSymbol[],
): TreeWalkAction<SymbolWalkState> {
  const name = getLuaFunctionName(node);
  if (name) {
    symbols.push(createSymbol(filePath, 'function', name, node));
  }

  return { skipChildren: true };
}
