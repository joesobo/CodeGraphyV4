import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '../../../../../../core/plugins/types/contracts';
import { getIdentifierText } from '../analyze/text';
import { createSymbol } from '../analyze/results';

function getAssignedFunctionValueNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const valueNode = node.childForFieldName('value') ?? node.namedChildren.at(-1);
  if (!valueNode) {
    return null;
  }

  const functionNodeTypes = new Set(['arrow_function', 'function', 'function_expression']);
  return functionNodeTypes.has(valueNode.type) ? valueNode : null;
}

export function getVariableAssignedFunctionSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
): IAnalysisSymbol | null {
  if (node.type !== 'variable_declarator') {
    return null;
  }

  const nameNode = node.childForFieldName('name') ?? node.namedChildren[0];
  const valueNode = getAssignedFunctionValueNode(node);
  const name = getIdentifierText(nameNode);

  if (!name || !valueNode) {
    return null;
  }

  return createSymbol(filePath, 'function', name, nameNode);
}
