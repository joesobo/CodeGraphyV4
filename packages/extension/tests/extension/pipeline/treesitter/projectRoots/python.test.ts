import { afterEach, describe, expect, it } from 'vitest';
import { getPythonSearchRoots } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/python';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
  writeProjectRootsFile,
} from './workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/python', () => {
  it('returns the nearest Python project root before the workspace root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'packages/api/src/index.py');
    writeProjectRootsFile(workspaceRoot, 'packages/api/pyproject.toml');

    expect(getPythonSearchRoots(filePath, workspaceRoot)).toEqual([
      `${workspaceRoot}/packages/api`,
      workspaceRoot,
    ]);
  });

  it('deduplicates the workspace root when it is also the Python project root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'src/index.py');
    writeProjectRootsFile(workspaceRoot, 'pyproject.toml');

    expect(getPythonSearchRoots(filePath, workspaceRoot)).toEqual([workspaceRoot]);
  });
});
