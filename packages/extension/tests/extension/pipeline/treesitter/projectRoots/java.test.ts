import { afterEach, describe, expect, it } from 'vitest';
import {
  resolveJavaSourceRoot,
  resolveJavaTypePath,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/java';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
  writeProjectRootsFile,
} from './workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/java', () => {
  it('finds the source root from the package path segments', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(
      workspaceRoot,
      'src/com/acme/app/Main.java',
      'package com.acme.app;\n',
    );

    expect(resolveJavaSourceRoot(filePath, 'com.acme.app')).toBe(`${workspaceRoot}/src`);
  });

  it('falls back to the nearest src directory when the package is unknown', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'src/com/acme/app/Main.java');

    expect(resolveJavaSourceRoot(filePath, null)).toBe(`${workspaceRoot}/src`);
  });

  it('resolves a Java type path under the source root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const sourceRoot = `${workspaceRoot}/src`;
    const typePath = writeProjectRootsFile(
      workspaceRoot,
      'src/com/acme/app/Support.java',
      'package com.acme.app;\n',
    );

    expect(resolveJavaTypePath(sourceRoot, 'com.acme.app.Support')).toBe(typePath);
    expect(resolveJavaTypePath(sourceRoot, 'com.acme.app.Missing')).toBeNull();
  });
});
