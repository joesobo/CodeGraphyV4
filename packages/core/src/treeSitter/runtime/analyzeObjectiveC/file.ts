import * as path from 'node:path';
import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { addCallRelation, addInheritRelation, normalizeAnalysisResult } from '../analyze/results';
import type { ImportedBinding } from '../analyze/model';
import {
  addLocalImport,
  addTextSymbol,
} from '../analyzeTextBaseline';
import {
  shouldIncludeTreeSitterSymbols,
  type TreeSitterAnalysisOptions,
} from '../options';

export function analyzeObjectiveCFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
  options: TreeSitterAnalysisOptions = {},
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const source = tree.rootNode.text;
  const importedTypePaths = new Map<string, string>();

  for (const match of source.matchAll(/^\s*#\s*import\s+(?:"([^"]+)"|<([^>]+)>)/gm)) {
    const specifier = match[1] ?? match[2];
    if (!specifier || specifier.includes('/usr/include') || specifier.startsWith('Foundation/')) {
      continue;
    }

    addLocalImport(
      relations,
      filePath,
      path.dirname(path.dirname(filePath)).startsWith(workspaceRoot) ? workspaceRoot : path.dirname(filePath),
      specifier,
      ['.h', '.m', '.mm'],
    );
    const relation = relations.at(-1);
    const typeName = specifier.split('/').pop()?.replace(/\.[hm]+$/, '');
    if (typeName && relation?.resolvedPath) {
      importedTypePaths.set(typeName, relation.resolvedPath);
    }
  }

  addObjectiveCMessageCallRelations(relations, filePath, tree.rootNode, importedTypePaths);

  for (const match of source.matchAll(/^\s*@interface\s+([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)(?:\s*<([^>]+)>)?/gm)) {
    const className = match[1];
    const inheritedNames = [
      match[2],
      ...(match[3]?.split(',').map(name => name.trim()).filter(Boolean) ?? []),
    ];
    const fromSymbolId = shouldIncludeTreeSitterSymbols(options)
      ? `${filePath}:class:${className}`
      : undefined;

    for (const typeName of inheritedNames) {
      addInheritRelation(
        relations,
        filePath,
        typeName,
        resolveObjectiveCImportPathForType(relations, typeName),
        fromSymbolId,
      );
    }
  }

  if (shouldIncludeTreeSitterSymbols(options)) {
    for (const match of source.matchAll(/^\s*@(interface|protocol|implementation)\s+([A-Za-z_]\w*)/gm)) {
      const kind = match[1] === 'protocol' ? 'protocol' : 'class';
      addTextSymbol(symbols, filePath, kind, match[2], tree.rootNode);
    }

    for (const match of source.matchAll(/^\s*[-+]\s*\([^)]*\)\s*([A-Za-z_]\w*)/gm)) {
      addTextSymbol(symbols, filePath, 'method', match[1], tree.rootNode);
    }
  }

  return normalizeAnalysisResult(filePath, symbols, relations);
}

function addObjectiveCMessageCallRelations(
  relations: IAnalysisRelation[],
  filePath: string,
  rootNode: Parser.SyntaxNode,
  importedTypePaths: ReadonlyMap<string, string>,
): void {
  const receiverTypes = collectObjectiveCReceiverTypes(rootNode);
  const seen = new Set<string>();

  visitObjectiveCNodes(rootNode, (node) => {
    if (node.type !== 'message_expression') {
      return;
    }

    const receiverType = readObjectiveCMessageReceiverType(node, receiverTypes, importedTypePaths);
    const resolvedPath = receiverType ? importedTypePaths.get(receiverType) : undefined;
    if (
      !receiverType
      || !resolvedPath
      || seen.has(receiverType)
      || isObjectiveCImplementationOwnHeaderCall(filePath, receiverType, resolvedPath)
    ) {
      return;
    }

    seen.add(receiverType);
    addCallRelation(relations, filePath, {
      importedName: receiverType,
      specifier: receiverType,
      resolvedPath,
    } satisfies ImportedBinding);
  });
}

function isObjectiveCImplementationOwnHeaderCall(
  filePath: string,
  receiverType: string,
  resolvedPath: string,
): boolean {
  return path.basename(filePath).replace(/\.[^.]+$/, '') === receiverType
    && path.basename(resolvedPath).replace(/\.[^.]+$/, '') === receiverType;
}

function collectObjectiveCReceiverTypes(rootNode: Parser.SyntaxNode): Map<string, string> {
  const receiverTypes = new Map<string, string>();

  visitObjectiveCNodes(rootNode, (node) => {
    if (node.type !== 'declaration' && node.type !== 'property_declaration') {
      return;
    }

    const typeName = findFirstObjectiveCTypeIdentifier(node);
    const variableName = findLastObjectiveCIdentifier(node);
    if (typeName && variableName) {
      receiverTypes.set(variableName, typeName);
    }
  });

  return receiverTypes;
}

function findFirstObjectiveCTypeIdentifier(node: Parser.SyntaxNode): string | null {
  if (node.type === 'type_identifier') {
    return node.text;
  }

  for (const child of node.namedChildren) {
    const typeName = findFirstObjectiveCTypeIdentifier(child);
    if (typeName) {
      return typeName;
    }
  }

  return null;
}

function readObjectiveCMessageReceiverType(
  messageExpression: Parser.SyntaxNode,
  receiverTypes: ReadonlyMap<string, string>,
  importedTypePaths: ReadonlyMap<string, string>,
): string | null {
  const receiver = messageExpression.namedChildren[0];
  if (!receiver) {
    return null;
  }

  if (receiver.type === 'identifier') {
    if (importedTypePaths.has(receiver.text)) {
      return receiver.text;
    }

    return receiverTypes.get(receiver.text) ?? null;
  }

  if (receiver.type === 'field_expression') {
    const owner = receiver.namedChildren[0]?.text;
    const fieldName = receiver.namedChildren.find(child => child.type === 'field_identifier')?.text;
    return owner === 'self' && fieldName ? receiverTypes.get(fieldName) ?? null : null;
  }

  if (receiver.type === 'message_expression') {
    return readObjectiveCMessageReceiverType(receiver, receiverTypes, importedTypePaths);
  }

  return null;
}

function findLastObjectiveCIdentifier(node: Parser.SyntaxNode): string | null {
  let identifier: string | null = null;
  visitObjectiveCNodes(node, (child) => {
    if (child.type === 'identifier') {
      identifier = child.text;
    }
  });
  return identifier;
}

function visitObjectiveCNodes(
  node: Parser.SyntaxNode,
  visit: (node: Parser.SyntaxNode) => void,
): void {
  visit(node);
  for (const child of node.namedChildren) {
    visitObjectiveCNodes(child, visit);
  }
}

function resolveObjectiveCImportPathForType(
  relations: readonly IAnalysisRelation[],
  typeName: string,
): string | null {
  return relations.find((relation) =>
    relation.kind === 'import'
    && relation.resolvedPath
    && relation.specifier?.split('/').pop()?.replace(/\.[hm]+$/, '') === typeName
  )?.resolvedPath ?? null;
}
