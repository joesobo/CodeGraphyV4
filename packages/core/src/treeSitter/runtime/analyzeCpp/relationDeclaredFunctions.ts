import type Parser from 'tree-sitter';
import { walkTree } from '../analyze/walk';
import { readCppDeclaratorName } from './relationDeclaratorNames';
import {
  isCppMethodDefinition,
  readCppFunctionSymbolName,
  readQualifiedCppFunctionName,
} from './relationFunctionNames';
import { isInsideClassLike } from './relationScopes';

export function readCppDeclaredFunctionNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (!isCppFunctionDeclarator(node)) {
      return;
    }

    const functionName = readCppDeclaratorName(node);
    if (functionName) {
      names.push(functionName);
    }
  });
  return names;
}

function isCppFunctionDeclarator(node: Parser.SyntaxNode): boolean {
  return node.type === 'function_declarator'
    && !isInsideClassLike(node)
    && !readQualifiedCppFunctionName(node);
}

export function readCppDefinedFunctionNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (node.type !== 'function_definition' || isCppMethodDefinition(node)) {
      return;
    }

    const functionName = readCppFunctionSymbolName(node);
    if (functionName) {
      names.push(functionName);
    }
    return { skipChildren: true };
  });
  return names;
}
