import type Parser from 'tree-sitter';
import type { TreeWalkAction } from '../../../analyze/model';
import { walkTree } from '../../../analyze/walk';
import { readCppDeclaratorName } from './declaratorNames';
import {
  isCppMethodDefinition,
  readCppFunctionSymbolName,
} from './functionNames';
import {
  isPureVirtualDeclaration,
  readContainingCppTypeName,
} from '../scopes';

export function readCppDeclaredMethodSymbols(rootNode: Parser.SyntaxNode): Array<{
  methodName: string;
  symbolName: string;
}> {
  const methods: Array<{ methodName: string; symbolName: string }> = [];
  walkTree(rootNode, {}, (node) => collectCppDeclaredMethodSymbol(node, methods));
  return methods;
}

function collectCppDeclaredMethodSymbol(
  node: Parser.SyntaxNode,
  methods: Array<{ methodName: string; symbolName: string }>,
): TreeWalkAction<unknown> | void {
  const method = readCppDefinedMethodSymbol(node) ?? readCppPureVirtualMethodSymbol(node);
  if (!method) {
    return;
  }

  methods.push(method);
  return { skipChildren: true };
}

function readCppDefinedMethodSymbol(
  node: Parser.SyntaxNode,
): { methodName: string; symbolName: string } | null {
  if (node.type !== 'function_definition' || !isCppMethodDefinition(node)) {
    return null;
  }

  return createCppMethodSymbol(
    readCppDeclaratorName(node.childForFieldName('declarator') ?? undefined),
    readCppFunctionSymbolName(node),
  );
}

function readCppPureVirtualMethodSymbol(
  node: Parser.SyntaxNode,
): { methodName: string; symbolName: string } | null {
  if (node.type !== 'field_declaration' || !isPureVirtualDeclaration(node)) {
    return null;
  }

  const methodName = readCppDeclaratorName(node);
  const className = readContainingCppTypeName(node);
  return methodName && className
    ? createCppMethodSymbol(methodName, `${className}::${methodName}`)
    : null;
}

function createCppMethodSymbol(
  methodName: string | null,
  symbolName: string | null,
): { methodName: string; symbolName: string } | null {
  return methodName && symbolName ? { methodName, symbolName } : null;
}
