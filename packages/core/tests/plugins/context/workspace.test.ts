import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isWithinWorkspace } from '../../../src/plugins/context/workspaceBounds';
import { createWorkspaceAnalysisFileSystem } from '../../../src/plugins/context/workspaceFileSystem';
import {
  listDirectoryWithinWorkspace,
  readTextFileWithinWorkspace,
} from '../../../src/plugins/context/workspaceRead';
import { createWorkspacePluginAnalysisContext } from '../../../src/plugins/context/workspace';

describe('plugins/context workspace bounds and file access', () => {
  it('keeps plugin file access inside the workspace root', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-workspace-context-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'codegraphy-workspace-outside-'));
    const sourceDirectory = join(workspaceRoot, 'src');
    const sourceFile = join(sourceDirectory, 'index.ts');
    const outsideFile = join(outsideRoot, 'secret.ts');

    await mkdir(sourceDirectory);
    await writeFile(sourceFile, 'export const value = 1;');
    await writeFile(outsideFile, 'export const secret = 1;');

    expect(isWithinWorkspace(workspaceRoot, workspaceRoot)).toBe(true);
    expect(isWithinWorkspace(workspaceRoot, sourceFile)).toBe(true);
    expect(isWithinWorkspace(workspaceRoot, outsideFile)).toBe(false);

    const fileSystem = createWorkspaceAnalysisFileSystem(workspaceRoot);
    await expect(fileSystem.exists(sourceFile)).resolves.toBe(true);
    await expect(fileSystem.exists(outsideFile)).resolves.toBe(false);
    await expect(fileSystem.isDirectory(sourceDirectory)).resolves.toBe(true);
    await expect(fileSystem.isDirectory(sourceFile)).resolves.toBe(false);
    await expect(fileSystem.isDirectory(outsideRoot)).resolves.toBe(false);
    await expect(fileSystem.isFile(sourceFile)).resolves.toBe(true);
    await expect(fileSystem.isFile(sourceDirectory)).resolves.toBe(false);
    await expect(fileSystem.isFile(outsideFile)).resolves.toBe(false);
    await expect(fileSystem.listDirectory(sourceDirectory)).resolves.toEqual(['index.ts']);
    await expect(fileSystem.readTextFile(sourceFile)).resolves.toBe('export const value = 1;');
  });

  it('returns null for missing or out-of-workspace reads', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-workspace-context-'));
    const outsideRoot = await mkdtemp(join(tmpdir(), 'codegraphy-workspace-outside-'));
    const outsideFile = join(outsideRoot, 'secret.ts');
    await writeFile(outsideFile, 'secret');

    await expect(listDirectoryWithinWorkspace(workspaceRoot, outsideRoot)).resolves.toBeNull();
    await expect(readTextFileWithinWorkspace(workspaceRoot, outsideFile)).resolves.toBeNull();
    await expect(listDirectoryWithinWorkspace(workspaceRoot, join(workspaceRoot, 'missing'))).resolves.toBeNull();
    await expect(readTextFileWithinWorkspace(workspaceRoot, join(workspaceRoot, 'missing.ts'))).resolves.toBeNull();

    const fileSystem = createWorkspaceAnalysisFileSystem(workspaceRoot);
    await expect(fileSystem.exists(join(workspaceRoot, 'missing.ts'))).resolves.toBe(false);
    await expect(fileSystem.isDirectory(join(workspaceRoot, 'missing'))).resolves.toBe(false);
    await expect(fileSystem.isFile(join(workspaceRoot, 'missing.ts'))).resolves.toBe(false);
  });

  it('exposes a lightweight discovered workspace inventory', () => {
    const workspaceFiles = [{
      absolutePath: '/workspace/src/app.ts',
      relativePath: 'src/app.ts',
      extension: '.ts',
    }];

    const context = createWorkspacePluginAnalysisContext('/workspace', { workspaceFiles });

    expect(context.workspaceFiles).toEqual(workspaceFiles);
    expect(context.workspaceFiles).not.toBe(workspaceFiles);
  });
});
