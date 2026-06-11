import type Parser from 'tree-sitter';
import { walkTree } from '../../../analyze/walk';
import { readCppDeclaratorName } from './declaratorNames';
import {
  isInsideClassLike,
} from '../scopes';
import {
  readQualifiedCppFunctionName,
} from './functionNames';

export function readCppDeclaredMethodNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (isCppMethodDeclarator(node)) {
      const methodName = readCppDeclaratorName(node);
      if (methodName) {
        names.push(methodName);
      }
    }
  });
  return names;
}

function isCppMethodDeclarator(node: Parser.SyntaxNode): boolean {
  return node.type === 'function_declarator'
    && (isInsideClassLike(node) || Boolean(readQualifiedCppFunctionName(node)));
}
