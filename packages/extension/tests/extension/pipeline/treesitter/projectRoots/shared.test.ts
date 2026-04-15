import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  dedupePaths,
  findNearestProjectRoot,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/shared';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
  writeProjectRootsFile,
} from './workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/shared', () => {
  it('finds the nearest marker while staying inside the workspace root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const projectRoot = path.join(workspaceRoot, 'packages', 'api');
    const filePath = writeProjectRootsFile(workspaceRoot, 'packages/api/src/index.py');
    writeProjectRootsFile(workspaceRoot, 'packages/api/pyproject.toml');

    expect(findNearestProjectRoot(filePath, ['pyproject.toml'], workspaceRoot)).toBe(projectRoot);
  });

  it('returns null when no marker exists before leaving the workspace root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'packages/api/src/index.py');

    expect(findNearestProjectRoot(filePath, ['pyproject.toml'], workspaceRoot)).toBeNull();
  });

  it('deduplicates and removes empty paths', () => {
    const workspaceRoot = createProjectRootsWorkspace();

    expect(dedupePaths([workspaceRoot, null, workspaceRoot, undefined])).toEqual([workspaceRoot]);
  });
});
