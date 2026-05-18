import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-lua-'));
  tempRoots.push(workspaceRoot);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  return workspaceRoot;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((workspaceRoot) =>
      fs.rm(workspaceRoot, { recursive: true, force: true }),
    ),
  );
});

describe('pipeline/plugins/treesitter/runtime/analyzeLua', () => {
  it('extracts Lua require relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'app/model/user.lua': 'local M = {}\nreturn M\n',
    });
    const runnerPath = path.join(workspaceRoot, 'app/runner.lua');
    const source = [
      'local user = require("app.model.user")',
      'local json = require("json")',
      '',
      'local Runner = {}',
      '',
      'function Runner.run(name)',
      '  return user.new(name)',
      'end',
      '',
      'local function boot()',
      '  return Runner.run("A")',
      'end',
      '',
      'return Runner',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(runnerPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'app.model.user',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'app/model/user.lua'),
        toFilePath: path.join(workspaceRoot, 'app/model/user.lua'),
      }),
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'json',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'table', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'Runner.run' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
    ]));
  });
});
