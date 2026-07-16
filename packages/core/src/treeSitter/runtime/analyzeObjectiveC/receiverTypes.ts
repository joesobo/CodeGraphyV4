import type Parser from 'tree-sitter';
import { findFirstObjectiveCTypeIdentifier, findLastObjectiveCIdentifier, visitObjectiveCNodes } from './treeWalk';

export function collectObjectiveCReceiverTypes(rootNode: Parser.SyntaxNode): Map<string, string> {
  const receiverTypes = new Map<string, string>();
  visitObjectiveCNodes(rootNode, (node) => {
    if (node.type !== 'declaration' && node.type !== 'property_declaration') return;
    const typeName = findFirstObjectiveCTypeIdentifier(node);
    const variableName = findLastObjectiveCIdentifier(node);
    if (typeName && variableName) receiverTypes.set(variableName, typeName);
  });
  return receiverTypes;
}

export function readObjectiveCMessageReceiverType(
  messageExpression: Parser.SyntaxNode,
  receiverTypes: ReadonlyMap<string, string>,
  importedTypePaths: ReadonlyMap<string, string>,
): string | null {
  const receiver = messageExpression.namedChildren[0];
  if (!receiver) return null;
  if (receiver.type === 'identifier') {
    return importedTypePaths.has(receiver.text) ? receiver.text : receiverTypes.get(receiver.text) ?? null;
  }
  if (receiver.type === 'field_expression') {
    return readObjectiveCFieldReceiverType(receiver, receiverTypes);
  }
  return receiver.type === 'message_expression'
    ? readObjectiveCMessageReceiverType(receiver, receiverTypes, importedTypePaths)
    : null;
}

function readObjectiveCFieldReceiverType(
  receiver: Parser.SyntaxNode,
  receiverTypes: ReadonlyMap<string, string>,
): string | null {
  const owner = receiver.namedChildren[0]?.text;
  const fieldName = receiver.namedChildren.find(child => child.type === 'field_identifier')?.text;
  return owner === 'self' && fieldName ? receiverTypes.get(fieldName) ?? null : null;
}
