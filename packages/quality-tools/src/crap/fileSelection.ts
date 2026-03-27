import { readFileSync } from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { pathIncludedByTool } from '../config/qualityConfig';
import { packagePathParts, toPosix } from '../shared/pathUtils';

function matchesFilterScope(relativePath: string, filterScope: string | undefined): boolean {
  if (!filterScope) {
    return true;
  }

  if (relativePath === filterScope) {
    return true;
  }

  return relativePath.startsWith(`${filterScope}/`);
}

export function shouldIncludeFile(
  filePath: string,
  filterScope: string | undefined,
  repoRoot: string
): boolean {
  const relativePath = toPosix(path.relative(repoRoot, filePath));
  if (!matchesFilterScope(relativePath, filterScope)) {
    return false;
  }

  const { packageName, packageRelativePath } = packagePathParts(relativePath);
  if (packageRelativePath === undefined) {
    return true;
  }

  return pathIncludedByTool(repoRoot, packageName!, 'crap', packageRelativePath);
}

export function createSourceFile(filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf-8'),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}
