import { afterEach, describe, expect, it } from 'vitest';
import {
  readGoModuleName,
  resolveGoPackageDirectory,
} from '../../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/go/module';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
  writeProjectRootsFile,
} from '../workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/go/module', () => {
  it('reads the Go module name from go.mod', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(readGoModuleName(workspaceRoot)).toBe('github.com/acme/project');
  });

  it('trims module names and rereads go.mod when the project file changes', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module   github.com/acme/project   \n');

    expect(readGoModuleName(workspaceRoot)).toBe('github.com/acme/project');

    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/other\n');
    expect(readGoModuleName(workspaceRoot)).toBe('github.com/acme/other');
  });

  it('returns the matching package directory for root and nested imports', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(resolveGoPackageDirectory(workspaceRoot, 'github.com/acme/project')).toBe(workspaceRoot);
    expect(resolveGoPackageDirectory(workspaceRoot, 'github.com/acme/project/pkg/api')).toBe(
      `${workspaceRoot}/pkg/api`,
    );
  });

  it('returns null when go.mod is missing or does not declare a root-level module line', () => {
    const workspaceRoot = createProjectRootsWorkspace();

    expect(resolveGoPackageDirectory(workspaceRoot, 'github.com/acme/project/pkg/api')).toBeNull();
    expect(resolveGoPackageDirectory(workspaceRoot, 'null/pkg/api')).toBeNull();
    expect(readGoModuleName(workspaceRoot)).toBeNull();

    const malformedWorkspaceRoot = createProjectRootsWorkspace();
    writeProjectRootsFile(
      malformedWorkspaceRoot,
      'go.mod',
      '// module github.com/acme/project\nrequire github.com/acme/project v1.0.0\n',
    );

    expect(readGoModuleName(malformedWorkspaceRoot)).toBeNull();
    expect(resolveGoPackageDirectory(malformedWorkspaceRoot, 'null/pkg/api')).toBeNull();
  });

  it('returns null for external imports even when the workspace has a valid module name', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(resolveGoPackageDirectory(workspaceRoot, 'github.com/other/project/pkg/api')).toBeNull();
  });
});
