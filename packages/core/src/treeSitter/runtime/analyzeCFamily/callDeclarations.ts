import * as fs from 'node:fs';
import Parser from 'tree-sitter';
import { createSymbolId } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { hasCallableFunctionDeclarator } from './names';
import { readDeclaratorName } from './callSyntax';
import type { CFamilyCallDeclarationTarget, CallableDeclarationSymbolKind } from './callTargets';

export function readIncludedRootNode(filePath: string, language: Parser.Language): Parser.SyntaxNode | null {
  try {
    const parser = new Parser();
    parser.setLanguage(language);
    return parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
  } catch {
    return null;
  }
}

export function readDeclaredFunctions(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  symbolsEnabled: boolean,
): Array<{ name: string; target: CFamilyCallDeclarationTarget }> {
  const declarations: Array<{ name: string; target: CFamilyCallDeclarationTarget }> = [];
  walkTree(rootNode, {}, (node) => {
    const symbolKind = getCallableDeclarationSymbolKind(node);
    const functionName = symbolKind ? readDeclaratorName(node.childForFieldName('declarator')) : null;
    if (symbolKind && functionName) declarations.push(createDeclaration(filePath, symbolKind, functionName, symbolsEnabled));
  });
  return declarations;
}

function getCallableDeclarationSymbolKind(node: Parser.SyntaxNode): CallableDeclarationSymbolKind | null {
  if (node.type === 'function_definition') return 'function';
  if (node.type !== 'declaration' && node.type !== 'function_declaration') return null;
  return hasCallableFunctionDeclarator(node) ? 'prototype' : null;
}

function createDeclaration(
  filePath: string,
  symbolKind: CallableDeclarationSymbolKind,
  name: string,
  symbolsEnabled: boolean,
): { name: string; target: CFamilyCallDeclarationTarget } {
  return {
    name,
    target: {
      filePath,
      symbolKind,
      ...(symbolsEnabled ? { symbolId: createSymbolId(filePath, symbolKind, name) } : {}),
    },
  };
}
