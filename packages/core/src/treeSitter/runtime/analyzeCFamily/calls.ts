import * as fs from 'node:fs';
import Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addCallRelation, createSymbolId } from '../analyze/results';
import { walkTree } from '../analyze/walk';
import { getOrCreateTreeSitterParser } from '../languages/parser';
import { hasCallableFunctionDeclarator } from './names';

type CallableDeclarationSymbolKind = 'function' | 'prototype';

interface CFamilyCallDeclarationTarget {
  filePath: string;
  symbolKind: CallableDeclarationSymbolKind;
  symbolId?: string;
}

interface CFamilyCallDeclarations {
  functionTargetByName: ReadonlyMap<string, CFamilyCallDeclarationTarget | null>;
}

export function readCFamilyCallDeclarations(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  relations: readonly IAnalysisRelation[],
  language: Parser.Language,
  symbolsEnabled: boolean,
): CFamilyCallDeclarations {
  const functionTargetByName = new Map<string, CFamilyCallDeclarationTarget | null>();

  for (const declaration of readDeclaredFunctions(rootNode, filePath, symbolsEnabled)) {
    setUniqueTarget(functionTargetByName, declaration.name, declaration.target);
  }

  const includedPaths = relations
    .filter((relation) => (relation.kind === 'include' || relation.kind === 'import') && relation.resolvedPath)
    .map((relation) => relation.resolvedPath)
    .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath));

  for (const includedPath of includedPaths) {
    const includedRootNode = readIncludedRootNode(includedPath, language);
    if (!includedRootNode) {
      continue;
    }

    for (const declaration of readDeclaredFunctions(includedRootNode, includedPath, symbolsEnabled)) {
      setUniqueTarget(functionTargetByName, declaration.name, declaration.target);
    }
  }

  return {
    functionTargetByName,
  };
}

export function addCFamilyCallRelation(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  declarations: CFamilyCallDeclarations,
  symbolsEnabled: boolean,
): void {
  const calleeName = readCallName(node);
  if (!calleeName) {
    return;
  }

  const target = resolveCallTarget(declarations, calleeName);
  if (!target) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    createCallBinding(calleeName, target.filePath),
    symbolsEnabled ? readEnclosingFunctionSymbolId(node, filePath) : undefined,
    symbolsEnabled ? target.symbolId : undefined,
  );
}

function readIncludedRootNode(filePath: string, language: Parser.Language): Parser.SyntaxNode | null {
  try {
    const parser = getOrCreateTreeSitterParser('c', Parser, language);
    return parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
  } catch {
    return null;
  }
}

function readDeclaredFunctions(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  symbolsEnabled: boolean,
): Array<{ name: string; target: CFamilyCallDeclarationTarget }> {
  const declarations: Array<{ name: string; target: CFamilyCallDeclarationTarget }> = [];
  walkTree(rootNode, {}, (node) => {
    const symbolKind = getCallableDeclarationSymbolKind(node);
    if (!symbolKind) {
      return;
    }

    const functionName = readDeclaratorName(node.childForFieldName('declarator') ?? undefined);
    if (functionName) {
      declarations.push({
        name: functionName,
        target: {
          filePath,
          symbolKind,
          ...(symbolsEnabled ? { symbolId: createSymbolId(filePath, symbolKind, functionName) } : {}),
        },
      });
    }
  });
  return declarations;
}

function getCallableDeclarationSymbolKind(node: Parser.SyntaxNode): CallableDeclarationSymbolKind | null {
  if (node.type === 'function_definition') {
    return 'function';
  }

  if (node.type === 'declaration' || node.type === 'function_declaration') {
    return hasCallableFunctionDeclarator(node) ? 'prototype' : null;
  }

  return null;
}

function readCallName(callExpression: Parser.SyntaxNode): string | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return readDeclaratorName(calleeNode);
}

function readEnclosingFunctionSymbolId(node: Parser.SyntaxNode, filePath: string): string | undefined {
  let current: Parser.SyntaxNode | null = node.parent;
  while (current) {
    if (current.type === 'function_definition') {
      const functionName = readDeclaratorName(current.childForFieldName('declarator') ?? undefined);
      return functionName ? createSymbolId(filePath, 'function', functionName) : undefined;
    }

    current = current.parent;
  }

  return undefined;
}

function readDeclaratorName(node: Parser.SyntaxNode | undefined | null): string | null {
  if (!node) {
    return null;
  }

  if (node.type === 'field_identifier' || node.type === 'identifier') {
    return node.text;
  }

  return node.childForFieldName('declarator')
    ? readDeclaratorName(node.childForFieldName('declarator'))
    : node.namedChildren.map(readDeclaratorName).find(Boolean) ?? null;
}

function resolveCallTarget(
  declarations: CFamilyCallDeclarations,
  calleeName: string,
): CFamilyCallDeclarationTarget | null {
  const target = declarations.functionTargetByName.get(calleeName);
  if (target !== undefined) {
    return target;
  }

  return null;
}

function createCallBinding(calleeName: string, targetPath: string): ImportedBinding {
  return {
    importedName: calleeName,
    localName: calleeName,
    resolvedPath: targetPath,
    specifier: calleeName,
  };
}

function setUniqueTarget(
  targetsByName: Map<string, CFamilyCallDeclarationTarget | null>,
  name: string,
  target: CFamilyCallDeclarationTarget,
): void {
  if (!targetsByName.has(name)) {
    targetsByName.set(name, target);
    return;
  }

  const existingTarget = targetsByName.get(name);
  if (!existingTarget) {
    return;
  }

  if (existingTarget.symbolKind === 'prototype' && target.symbolKind === 'function') {
    targetsByName.set(name, target);
    return;
  }

  if (existingTarget.symbolKind === 'function' && target.symbolKind === 'prototype') {
    return;
  }

  targetsByName.set(
    name,
    existingTarget.filePath === target.filePath && existingTarget.symbolId === target.symbolId
      ? existingTarget
      : null,
  );
}
