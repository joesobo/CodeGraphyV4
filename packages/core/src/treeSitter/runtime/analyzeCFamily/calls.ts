import * as fs from 'node:fs';
import Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addCallRelation, createSymbolId } from '../analyze/results';
import { walkTree } from '../analyze/walk';

interface CFamilyIncludedCallDeclarations {
  fallbackPath: string | null;
  functionPathByName: ReadonlyMap<string, string | null>;
}

export function readCFamilyIncludedCallDeclarations(
  relations: readonly IAnalysisRelation[],
  language: Parser.Language,
): CFamilyIncludedCallDeclarations {
  const includedPaths = relations
    .filter((relation) => relation.kind === 'import' && relation.resolvedPath)
    .map((relation) => relation.resolvedPath)
    .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath));
  const functionPathByName = new Map<string, string | null>();

  for (const includedPath of includedPaths) {
    const includedRootNode = readIncludedRootNode(includedPath, language);
    if (!includedRootNode) {
      continue;
    }

    for (const functionName of readDeclaredFunctionNames(includedRootNode)) {
      setUniquePath(functionPathByName, functionName, includedPath);
    }
  }

  return {
    fallbackPath: includedPaths.length === 1 ? includedPaths[0] : null,
    functionPathByName,
  };
}

export function addCFamilyCallRelation(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  includedDeclarations: CFamilyIncludedCallDeclarations,
  symbolsEnabled: boolean,
): void {
  const calleeName = readCallName(node);
  if (!calleeName) {
    return;
  }

  const targetPath = resolveCallPath(includedDeclarations, calleeName);
  if (!targetPath) {
    return;
  }

  addCallRelation(
    relations,
    filePath,
    createCallBinding(calleeName, targetPath),
    symbolsEnabled ? readEnclosingFunctionSymbolId(node, filePath) : undefined,
  );
}

function readIncludedRootNode(filePath: string, language: Parser.Language): Parser.SyntaxNode | null {
  try {
    const parser = new Parser();
    parser.setLanguage(language);
    return parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
  } catch {
    return null;
  }
}

function readDeclaredFunctionNames(rootNode: Parser.SyntaxNode): string[] {
  const names: string[] = [];
  walkTree(rootNode, {}, (node) => {
    if (node.type !== 'declaration' && node.type !== 'function_declaration') {
      return;
    }

    const functionName = readDeclaratorName(node.childForFieldName('declarator') ?? undefined);
    if (functionName) {
      names.push(functionName);
    }
  });
  return names;
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

function resolveCallPath(
  includedDeclarations: CFamilyIncludedCallDeclarations,
  calleeName: string,
): string | null {
  const functionPath = includedDeclarations.functionPathByName.get(calleeName);
  if (functionPath !== undefined) {
    return functionPath;
  }

  return includedDeclarations.fallbackPath;
}

function createCallBinding(calleeName: string, targetPath: string): ImportedBinding {
  return {
    importedName: calleeName,
    localName: calleeName,
    resolvedPath: targetPath,
    specifier: calleeName,
  };
}

function setUniquePath(pathsByName: Map<string, string | null>, name: string, filePath: string): void {
  const existingPath = pathsByName.get(name);
  pathsByName.set(name, existingPath && existingPath !== filePath ? null : filePath);
}
