import type Parser from 'tree-sitter';
import { walkTree } from '../analyze/walk';
import { readCppDeclaratorName } from './relationDeclaratorNames';
import {
  isInsideClassLike,
} from './relationScopes';
import {
  readQualifiedCppFunctionName,
} from './relationFunctionNames';

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
