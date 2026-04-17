import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  dedupePaths,
  findNearestProjectRoot,
} from '../../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/search';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
  writeProjectRootsFile,
} from '../workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/search', () => {
  it('finds the nearest marker while staying inside the workspace root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const projectRoot = path.join(workspaceRoot, 'packages', 'api');
    const filePath = writeProjectRootsFile(workspaceRoot, 'packages/api/src/index.py');
    writeProjectRootsFile(workspaceRoot, 'packages/api/pyproject.toml');

    expect(findNearestProjectRoot(filePath, ['pyproject.toml'], workspaceRoot)).toBe(projectRoot);
  });

  it('returns the workspace root when the nearest marker lives at the workspace boundary', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'src/index.py');
    writeProjectRootsFile(workspaceRoot, 'pyproject.toml');

    expect(findNearestProjectRoot(filePath, ['pyproject.toml'], workspaceRoot)).toBe(workspaceRoot);
  });

  it('returns null when no marker exists before leaving the workspace root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'packages/api/src/index.py');

    expect(findNearestProjectRoot(filePath, ['pyproject.toml'], workspaceRoot)).toBeNull();
  });

  it('does not walk outside the workspace root when a parent directory has a matching marker', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const outerRoot = path.dirname(workspaceRoot);
    const filePath = writeProjectRootsFile(workspaceRoot, 'packages/api/src/index.py');
    writeProjectRootsFile(outerRoot, 'pyproject.toml');

    expect(findNearestProjectRoot(filePath, ['pyproject.toml'], workspaceRoot)).toBeNull();
  });

  it('returns null when the requested file path already starts outside the workspace root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const outsideRoot = createProjectRootsWorkspace();
    const outsideFilePath = writeProjectRootsFile(outsideRoot, 'src/index.py');
    writeProjectRootsFile(outsideRoot, 'pyproject.toml');

    expect(findNearestProjectRoot(outsideFilePath, ['pyproject.toml'], workspaceRoot)).toBeNull();
  });

  it('deduplicates and removes empty paths', () => {
    const workspaceRoot = createProjectRootsWorkspace();

    expect(
      dedupePaths([workspaceRoot, '', null, `${workspaceRoot}/src`, workspaceRoot, undefined]),
    ).toEqual([workspaceRoot, `${workspaceRoot}/src`]);
  });
});
