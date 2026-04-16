import { afterEach, describe, expect, it } from 'vitest';
import { resolveGoPackagePath } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/goPackagePath';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
  writeProjectRootsFile,
} from './workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/goPackagePath', () => {
  it('prefers a direct package file when the import resolves to package.go', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'cmd/app/main.go');
    const directFilePath = writeProjectRootsFile(workspaceRoot, 'internal.go', 'package internal\n');
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(
      resolveGoPackagePath(filePath, workspaceRoot, 'github.com/acme/project/internal'),
    ).toBe(directFilePath);
  });

  it('falls back to the first non-test file in the package directory', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'cmd/app/main.go');
    const alphaPath = writeProjectRootsFile(workspaceRoot, 'pkg/api/alpha.go', 'package api\n');
    writeProjectRootsFile(workspaceRoot, 'pkg/api/alpha_test.go', 'package api\n');
    writeProjectRootsFile(workspaceRoot, 'pkg/api/zeta.go', 'package api\n');
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(
      resolveGoPackagePath(filePath, workspaceRoot, 'github.com/acme/project/pkg/api'),
    ).toBe(alphaPath);
  });

  it('resolves the root package directory when the import path matches the module name', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'cmd/app/main.go');
    const rootPackagePath = writeProjectRootsFile(workspaceRoot, 'app.go', 'package project\n');
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(
      resolveGoPackagePath(filePath, workspaceRoot, 'github.com/acme/project'),
    ).toBe(rootPackagePath);
  });

  it('returns null when the package directory is missing, not a directory, or only contains test files', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'cmd/app/main.go');
    writeProjectRootsFile(workspaceRoot, 'pkg/onlytests/api_test.go', 'package api\n');
    writeProjectRootsFile(workspaceRoot, 'pkg/not-a-dir', 'plain file');
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(
      resolveGoPackagePath(filePath, workspaceRoot, 'github.com/acme/project/pkg/missing'),
    ).toBeNull();
    expect(
      resolveGoPackagePath(filePath, workspaceRoot, 'github.com/acme/project/pkg/not-a-dir'),
    ).toBeNull();
    expect(
      resolveGoPackagePath(filePath, workspaceRoot, 'github.com/acme/project/pkg/onlytests'),
    ).toBeNull();
  });

  it('returns null when no go.mod can be found between the file and workspace root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'cmd/app/main.go');
    writeProjectRootsFile(workspaceRoot, 'pkg/api/alpha.go', 'package api\n');

    expect(
      resolveGoPackagePath(filePath, workspaceRoot, 'github.com/acme/project/pkg/api'),
    ).toBeNull();
  });

  it('returns null when the package cannot be resolved inside the module', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'cmd/app/main.go');
    writeProjectRootsFile(workspaceRoot, 'go.mod', 'module github.com/acme/project\n');

    expect(
      resolveGoPackagePath(filePath, workspaceRoot, 'github.com/other/project/pkg/api'),
    ).toBeNull();
  });
});
