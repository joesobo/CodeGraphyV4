import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '../../../../../../core/plugins/types/contracts';
import { getIdentifierText } from './text';
import { createSymbol } from './results';

export function getVariableAssignedFunctionSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
): IAnalysisSymbol | null {
  if (node.type !== 'variable_declarator') {
    return null;
  }

  const nameNode = node.childForFieldName('name') ?? node.namedChildren[0];
  const valueNode = node.childForFieldName('value') ?? node.namedChildren.at(-1);
  const name = getIdentifierText(nameNode);

  if (!name || !valueNode) {
    return null;
  }

  if (
    valueNode.type !== 'arrow_function'
    && valueNode.type !== 'function'
    && valueNode.type !== 'function_expression'
  ) {
    return null;
  }

  return createSymbol(filePath, 'function', name, nameNode);
}
