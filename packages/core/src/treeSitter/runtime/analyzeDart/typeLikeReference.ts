import type Parser from 'tree-sitter';
import { isFollowedByDartArgumentSelector } from './argumentSelector';

const NON_REFERENCE_PARENT_TYPES = new Set([
  'class_definition',
  'mixin_declaration',
  'extension_declaration',
  'function_signature',
  'method_signature',
  'type_alias',
  'typed_identifier',
  'static_final_declaration',
  'initialized_variable_definition',
  'local_variable_declaration',
]);

export function isDartTypeLikeExpressionReference(node: Parser.SyntaxNode): boolean {
  if (!/^[A-Z]/u.test(node.text)) return false;
  const parent = node.parent;
  if (!parent) return false;
  if (parent.type === 'selector' || isFollowedByDartArgumentSelector(node)) return true;
  if (parent.type === 'initialized_formal_parameter') return false;
  return !NON_REFERENCE_PARENT_TYPES.has(parent.type);
}
