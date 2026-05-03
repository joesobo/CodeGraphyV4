import * as path from 'node:path';
import { findExistingFile } from '../analyze/existingFile';

function rubyPathCandidates(basePath: string): string[] {
  return [
    `${basePath}.rb`,
    path.join(basePath, 'index.rb'),
  ];
}

export function resolveRubyRequirePath(
  filePath: string,
  workspaceRoot: string,
  specifier: string,
  isRelative: boolean,
): string | null {
  if (isRelative) {
    return findExistingFile(rubyPathCandidates(path.resolve(path.dirname(filePath), specifier)));
  }

  return findExistingFile([
    ...rubyPathCandidates(path.resolve(workspaceRoot, specifier)),
    ...rubyPathCandidates(path.resolve(workspaceRoot, 'lib', specifier)),
  ]);
}

export function getRubyRequireConstantName(specifier: string): string {
  return path.basename(specifier)
    .split('_')
    .filter(Boolean)
    .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
    .join('');
}
