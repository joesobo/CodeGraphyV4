import * as path from 'node:path';
import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { ImportedBinding } from '../analyze/model';
import { addCallRelation } from '../analyze/results';
import { collectObjectiveCReceiverTypes, readObjectiveCMessageReceiverType } from './receiverTypes';
import { visitObjectiveCNodes } from './treeWalk';

export function addObjectiveCMessageCallRelations(
  relations: IAnalysisRelation[],
  filePath: string,
  rootNode: Parser.SyntaxNode,
  importedTypePaths: ReadonlyMap<string, string>,
): void {
  const receiverTypes = collectObjectiveCReceiverTypes(rootNode);
  const seen = new Set<string>();
  visitObjectiveCNodes(rootNode, node => {
    if (node.type === 'message_expression') {
      addObjectiveCMessageCall(node, relations, filePath, receiverTypes, importedTypePaths, seen);
    }
  });
}

function addObjectiveCMessageCall(
  node: Parser.SyntaxNode,
  relations: IAnalysisRelation[],
  filePath: string,
  receiverTypes: ReadonlyMap<string, string>,
  importedTypePaths: ReadonlyMap<string, string>,
  seen: Set<string>,
): void {
  const receiverType = readObjectiveCMessageReceiverType(node, receiverTypes, importedTypePaths);
  const resolvedPath = receiverType ? importedTypePaths.get(receiverType) : undefined;
  if (!receiverType || !resolvedPath || seen.has(receiverType) || isOwnHeaderCall(filePath, receiverType, resolvedPath)) return;
  seen.add(receiverType);
  addCallRelation(relations, filePath, {
    importedName: receiverType,
    specifier: receiverType,
    resolvedPath,
  } satisfies ImportedBinding);
}

function isOwnHeaderCall(filePath: string, receiverType: string, resolvedPath: string): boolean {
  return path.basename(filePath).replace(/\.[^.]+$/, '') === receiverType
    && path.basename(resolvedPath).replace(/\.[^.]+$/, '') === receiverType;
}
