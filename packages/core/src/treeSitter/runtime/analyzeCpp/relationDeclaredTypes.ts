import type Parser from 'tree-sitter';
import { walkTree } from '../analyze/walk';
import { CPP_TYPE_NODE_TYPES } from './relationModel';

export function readCppDeclaredTypeNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (CPP_TYPE_NODE_TYPES.has(node.type)) {
      const typeName = node.childForFieldName('name')?.text;
      if (typeName) {
        names.push(typeName);
      }
    }
  });
  return names;
}
