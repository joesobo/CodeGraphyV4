import * as fs from 'node:fs';
import CppLanguage from 'tree-sitter-cpp';
import Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { walkTree } from '../../../analyze/walk';
import { handleCInclude } from '../../../analyzeCFamily/includes';
import { getOrCreateTreeSitterParser } from '../../../languages/parser';

export function readInitialIncludedPaths(relations: readonly IAnalysisRelation[]): string[] {
  const includedPaths: string[] = [];
  for (const relation of relations) {
    if (relation.kind === 'include' && relation.resolvedPath) {
      includedPaths.push(relation.resolvedPath);
    }
  }
  return includedPaths;
}

export function readTransitiveIncludedPaths(
  includedPaths: readonly string[],
  workspaceRoot: string,
): string[] {
  const visited = new Set<string>();
  const orderedPaths: string[] = [];
  const pending = [...includedPaths];

  while (pending.length > 0) {
    const includedPath = pending.shift();
    if (!includedPath || visited.has(includedPath)) {
      continue;
    }

    visited.add(includedPath);
    orderedPaths.push(includedPath);
    pending.push(...readNestedCppIncludePaths(includedPath, workspaceRoot));
  }

  return orderedPaths;
}

function readNestedCppIncludePaths(includedPath: string, workspaceRoot: string): string[] {
  const includedRootNode = readIncludedCppRootNode(includedPath);
  return includedRootNode
    ? readResolvedCppIncludePaths(includedRootNode, includedPath, workspaceRoot)
    : [];
}

function readResolvedCppIncludePaths(
  rootNode: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
): string[] {
  const relations: IAnalysisRelation[] = [];
  walkTree(rootNode, {}, (node) => {
    if (node.type === 'preproc_include') {
      handleCInclude(node, filePath, workspaceRoot, relations, 'include');
    }
  });

  return relations
    .map((relation) => relation.resolvedPath)
    .filter((resolvedPath): resolvedPath is string => Boolean(resolvedPath));
}

export function readIncludedCppRootNode(filePath: string): Parser.SyntaxNode | null {
  try {
    const parser = getOrCreateTreeSitterParser(
      'cpp',
      Parser,
      CppLanguage as unknown as Parser.Language,
    );
    return parser.parse(fs.readFileSync(filePath, 'utf8')).rootNode;
  } catch {
    return null;
  }
}
