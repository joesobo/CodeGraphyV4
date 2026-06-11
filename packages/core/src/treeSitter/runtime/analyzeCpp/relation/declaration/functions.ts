import type Parser from 'tree-sitter';
import { walkTree } from '../../../analyze/walk';
import { readCppDeclaratorName } from './declaratorNames';
import {
  isCppMethodDefinition,
  readCppFunctionSymbolName,
  readQualifiedCppFunctionName,
} from './functionNames';
import { isInsideClassLike } from '../scopes';

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
