import * as path from 'node:path';
import type Parser from 'tree-sitter';
import { readKotlinPackageFiles, readKotlinRootNode } from './packageFiles';

export function collectKotlinCallablePaths(
  filePath: string,
  tree: Parser.Tree,
  sourceRoot: string | null,
  packageName: string | null,
): Map<string, string> {
  const callablePaths = new Map<string, string>();
  addKotlinCallableNames(tree.rootNode, filePath, callablePaths);
  if (!sourceRoot || !packageName) return callablePaths;
  const packageDirectory = path.join(sourceRoot, ...packageName.split('.'));
  for (const candidatePath of readKotlinPackageFiles(packageDirectory)) {
    if (candidatePath !== filePath) addKotlinFileCallableNames(candidatePath, callablePaths);
  }
  return callablePaths;
}

function addKotlinFileCallableNames(candidatePath: string, callablePaths: Map<string, string>): void {
  const rootNode = readKotlinRootNode(candidatePath);
  if (rootNode) addKotlinCallableNames(rootNode, candidatePath, callablePaths);
}

function addKotlinCallableNames(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  callablePaths: Map<string, string>,
): void {
  for (const node of rootNode.descendantsOfType([
    'class_declaration',
    'function_declaration',
    'object_declaration',
  ])) {
    const name = node.childForFieldName('name')?.text ?? node.namedChildren[0]?.text;
    if (name && !callablePaths.has(name)) callablePaths.set(name, filePath);
  }
}
