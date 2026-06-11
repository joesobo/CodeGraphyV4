import type Parser from 'tree-sitter';
import { readCppDeclaratorName } from './relationDeclaratorNames';
import { readCppTypeName } from './relationTypeNames';

export function readCppCallName(callExpression: Parser.SyntaxNode): string | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  if (!calleeNode) {
    return null;
  }

  if (calleeNode.type === 'field_expression') {
    return readCppDeclaratorName(
      calleeNode.childForFieldName('field')
        ?? calleeNode.namedChildren.find((child) => child.type === 'field_identifier'),
    );
  }

  return readCppDeclaratorName(calleeNode) ?? readCppTypeName(calleeNode);
}
