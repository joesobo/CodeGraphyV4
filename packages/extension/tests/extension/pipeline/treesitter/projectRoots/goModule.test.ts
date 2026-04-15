import { afterEach, describe, expect, it } from 'vitest';
import {
  readGoModuleName,
  resolveGoPackageDirectory,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/goModule';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
  writeProjectRootsFile,
} from './workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/goModule', () => {
  it('reads the Go module name from go.mod', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(readGoModuleName(workspaceRoot)).toBe('github.com/acme/project');
  });

  it('returns the matching package directory for root and nested imports', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(resolveGoPackageDirectory(workspaceRoot, 'github.com/acme/project')).toBe(workspaceRoot);
    expect(resolveGoPackageDirectory(workspaceRoot, 'github.com/acme/project/pkg/api')).toBe(
      `${workspaceRoot}/pkg/api`,
    );
  });

  it('returns null for external imports and missing module declarations', () => {
    const workspaceRoot = createProjectRootsWorkspace();

    expect(resolveGoPackageDirectory(workspaceRoot, 'github.com/acme/project/pkg/api')).toBeNull();

    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');
    expect(resolveGoPackageDirectory(workspaceRoot, 'github.com/other/project/pkg/api')).toBeNull();
  });
});
