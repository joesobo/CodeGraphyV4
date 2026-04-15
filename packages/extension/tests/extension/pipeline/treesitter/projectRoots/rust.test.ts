import { afterEach, describe, expect, it } from 'vitest';
import { getRustCrateRoot } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/rust';
import {
  cleanupProjectRootsWorkspaces,
  createProjectRootsWorkspace,
  writeProjectRootsFile,
} from './workspace';

afterEach(() => {
  cleanupProjectRootsWorkspaces();
});

describe('pipeline/plugins/treesitter/runtime/projectRoots/rust', () => {
  it('returns the nearest Cargo crate root', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'crates/app/src/lib.rs');
    writeProjectRootsFile(workspaceRoot, 'crates/app/Cargo.toml');

    expect(getRustCrateRoot(filePath, workspaceRoot)).toBe(`${workspaceRoot}/crates/app`);
  });

  it('falls back to the workspace root when no Cargo manifest exists', () => {
    const workspaceRoot = createProjectRootsWorkspace();
    const filePath = writeProjectRootsFile(workspaceRoot, 'crates/app/src/lib.rs');

    expect(getRustCrateRoot(filePath, workspaceRoot)).toBe(workspaceRoot);
  });
});
