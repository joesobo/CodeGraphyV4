import type Parser from 'tree-sitter';
import type { ImportedBinding } from '../analyze/model';
import { getIdentifierText, getLastPathSegment } from '../analyze/nodes';

export function getRustCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const identifier = getIdentifierText(calleeNode) ?? (
    calleeNode?.type === 'scoped_identifier'
      ? getLastPathSegment(calleeNode.text, '::')
      : null
  );

  return identifier ? importedBindings.get(identifier) ?? null : null;
}
