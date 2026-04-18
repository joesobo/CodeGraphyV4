import type Parser from 'tree-sitter';
import {
  getCSharpFileScopedNamespaceName,
  getCSharpIdentifierText,
  getCSharpNamespaceName,
  getCSharpNodeText,
} from './text';

export {
  getCSharpFileScopedNamespaceName,
  getCSharpIdentifierText,
  getCSharpNamespaceName,
  getCSharpNodeText,
};

export function isCSharpTypeDeclarationNode(node: Parser.SyntaxNode): boolean {
  return (
    node.type === 'class_declaration'
    || node.type === 'enum_declaration'
    || node.type === 'interface_declaration'
    || node.type === 'struct_declaration'
  );
}
