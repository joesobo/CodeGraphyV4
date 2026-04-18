import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  isWithinRoot,
  shouldStopProjectRootWalk,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/workspaceBounds';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
} from './workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/workspaceBounds', () => {
  it('detects when a candidate path is inside or outside the workspace root', () => {
    const workspaceRoot = createProjectRootsWorkspace();

    expect(isWithinRoot(workspaceRoot, workspaceRoot)).toBe(true);
    expect(isWithinRoot(path.join(workspaceRoot, 'src'), workspaceRoot)).toBe(true);
    expect(isWithinRoot(path.dirname(workspaceRoot), workspaceRoot)).toBe(false);
    expect(isWithinRoot(path.join(path.dirname(workspaceRoot), 'sibling'), workspaceRoot)).toBe(false);
  });

  it('stops the project-root walk at the workspace boundary, filesystem root, or any path outside the workspace', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const nestedPath = path.join(workspaceRoot, 'src');

    expect(shouldStopProjectRootWalk(path.dirname(workspaceRoot), workspaceRoot)).toBe(true);
    expect(shouldStopProjectRootWalk(path.dirname(nestedPath), workspaceRoot)).toBe(false);
    expect(shouldStopProjectRootWalk(path.join(path.dirname(workspaceRoot), 'sibling'), workspaceRoot)).toBe(true);
  });
});
