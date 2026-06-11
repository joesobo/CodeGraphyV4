import type Parser from 'tree-sitter';
import { CPP_TYPE_NODE_TYPES } from './relationModel';
import { readCppDeclaratorName } from './relationDeclaratorNames';

export function readCppFunctionSymbolName(functionDefinition: Parser.SyntaxNode): string | null {
  return readQualifiedCppFunctionName(functionDefinition.childForFieldName('declarator') ?? undefined)
    ?? readCppDeclaratorName(functionDefinition.childForFieldName('declarator') ?? undefined);
}

export function readQualifiedCppFunctionName(node: Parser.SyntaxNode | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node.type === 'qualified_identifier') {
    return node.text;
  }

  const declarator = node.childForFieldName('declarator');
  return declarator
    ? readQualifiedCppFunctionName(declarator)
    : node.namedChildren.map(readQualifiedCppFunctionName).find(Boolean) ?? null;
}

export function isCppMethodDefinition(functionDefinition: Parser.SyntaxNode): boolean {
  if (functionDefinition.parent && CPP_TYPE_NODE_TYPES.has(functionDefinition.parent.type)) {
    return true;
  }

  return Boolean(readQualifiedCppFunctionName(functionDefinition.childForFieldName('declarator') ?? undefined));
}
