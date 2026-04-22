import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWorkspacePluginAnalysisContext } from '../../../../src/core/plugins/context/workspace';

describe('createWorkspacePluginAnalysisContext', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-workspace-context-'));
    fs.mkdirSync(path.join(workspaceRoot, 'src', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, 'src', 'app.ts'), 'export const app = true;\n');
    fs.writeFileSync(path.join(workspaceRoot, 'src', 'nested', 'value.ts'), 'export const value = 1;\n');
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('reads files and directories inside the workspace and rejects paths outside it', async () => {
    const context = createWorkspacePluginAnalysisContext(workspaceRoot);
    const filePath = path.join(workspaceRoot, 'src', 'app.ts');
    const directoryPath = path.join(workspaceRoot, 'src');
    const missingPath = path.join(workspaceRoot, 'missing.ts');
    const outsidePath = path.join(path.dirname(workspaceRoot), 'outside.ts');

    expect(context.mode).toBe('workspace');
    await expect(context.fileSystem.exists(workspaceRoot)).resolves.toBe(true);
    await expect(context.fileSystem.exists(filePath)).resolves.toBe(true);
    await expect(context.fileSystem.exists(directoryPath)).resolves.toBe(true);
    await expect(context.fileSystem.exists(missingPath)).resolves.toBe(false);
    await expect(context.fileSystem.exists(outsidePath)).resolves.toBe(false);

    await expect(context.fileSystem.isDirectory(workspaceRoot)).resolves.toBe(true);
    await expect(context.fileSystem.isDirectory(directoryPath)).resolves.toBe(true);
    await expect(context.fileSystem.isDirectory(filePath)).resolves.toBe(false);
    await expect(context.fileSystem.isDirectory(outsidePath)).resolves.toBe(false);

    await expect(context.fileSystem.isFile(filePath)).resolves.toBe(true);
    await expect(context.fileSystem.isFile(directoryPath)).resolves.toBe(false);
    await expect(context.fileSystem.isFile(missingPath)).resolves.toBe(false);
    await expect(context.fileSystem.isFile(outsidePath)).resolves.toBe(false);

    await expect(context.fileSystem.listDirectory(workspaceRoot)).resolves.toEqual(['src']);
    await expect(context.fileSystem.listDirectory(directoryPath)).resolves.toEqual(['app.ts', 'nested']);
    await expect(context.fileSystem.listDirectory(filePath)).resolves.toBeNull();
    await expect(context.fileSystem.listDirectory(outsidePath)).resolves.toBeNull();

    await expect(context.fileSystem.readTextFile(filePath)).resolves.toBe('export const app = true;\n');
    await expect(context.fileSystem.readTextFile(directoryPath)).resolves.toBeNull();
    await expect(context.fileSystem.readTextFile(missingPath)).resolves.toBeNull();
    await expect(context.fileSystem.readTextFile(outsidePath)).resolves.toBeNull();
  });
});
