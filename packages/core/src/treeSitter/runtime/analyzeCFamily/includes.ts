import * as path from 'node:path';
import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { findExistingFile } from '../analyze/existingFile';
import { addImportRelation } from '../analyze/results';
import { TREE_SITTER_SOURCE_IDS } from '../languages';

interface IncludeSpecifier {
  isQuoted: boolean;
  specifier: string;
}

function getIncludePathNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  return node.childForFieldName('path')
    ?? node.namedChildren.find((child) =>
      child.type === 'string_literal' || child.type === 'system_lib_string',
    )
    ?? null;
}

function readIncludeSpecifier(node: Parser.SyntaxNode): IncludeSpecifier | null {
  const pathNode = getIncludePathNode(node);
  if (!pathNode) {
    return null;
  }

  if (pathNode.type === 'string_literal') {
    return {
      isQuoted: true,
      specifier: pathNode.text.slice(1, -1),
    };
  }

  if (pathNode.type === 'system_lib_string') {
    return {
      isQuoted: false,
      specifier: pathNode.text.slice(1, -1),
    };
  }

  return null;
}

function resolveIncludePath(
  filePath: string,
  workspaceRoot: string,
  include: IncludeSpecifier,
): string | null {
  const candidates = include.isQuoted
    ? [
      path.resolve(path.dirname(filePath), include.specifier),
      path.resolve(workspaceRoot, include.specifier),
    ]
    : [path.resolve(workspaceRoot, include.specifier)];

  return findExistingFile(candidates);
}

export function handleCInclude(
  node: Parser.SyntaxNode,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
): void {
  const include = readIncludeSpecifier(node);
  if (!include) {
    return;
  }

  addImportRelation(
    relations,
    filePath,
    include.specifier,
    resolveIncludePath(filePath, workspaceRoot, include),
    'include',
    TREE_SITTER_SOURCE_IDS.include,
  );
}
