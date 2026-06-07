import type Parser from 'tree-sitter';
import type { ImportedBinding } from '../analyze/model';
import { getIdentifierText, getLastPathSegment } from '../analyze/nodes';

export function getRustCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const identifier = getIdentifierText(calleeNode);
  if (identifier) {
    return importedBindings.get(identifier) ?? null;
  }

  if (calleeNode?.type !== 'scoped_identifier') {
    return null;
  }

  const [moduleName] = calleeNode.text.split('::');
  return importedBindings.get(moduleName)
    ?? importedBindings.get(getLastPathSegment(calleeNode.text, '::') ?? '')
    ?? null;
}
