import type Parser from 'tree-sitter';
import { walkTree } from '../../../analyze/walk';
import type { CppOverrideMethod } from '../model';
import { readCppDeclaratorName } from '../declaration/declaratorNames';
import { isInsideFunctionDefinition } from '../scopes';

export function readCppOverrideMethods(typeNode: Parser.SyntaxNode): CppOverrideMethod[] {
  const methods: CppOverrideMethod[] = [];
  walkTree(typeNode, {}, (node) => {
    if (!isCppOverrideFunctionDeclarator(node)) {
      return;
    }

    const methodName = readCppDeclaratorName(node);
    if (methodName) {
      methods.push({
        methodName,
        sourceSymbolKind: isInsideFunctionDefinition(node) ? 'method' : 'class',
      });
    }
  });
  return methods;
}

function isCppOverrideFunctionDeclarator(node: Parser.SyntaxNode): boolean {
  return node.type === 'function_declarator'
    && node.namedChildren.some((child) =>
      child.type === 'virtual_specifier' && child.text === 'override'
    );
}
