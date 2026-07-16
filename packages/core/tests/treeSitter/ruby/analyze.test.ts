import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-ruby-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeRuby', () => {
  it('omits symbols when symbol extraction is disabled', async () => {
    const workspaceRoot = await createWorkspace({});
    const filePath = path.join(workspaceRoot, 'app.rb');

    const result = await analyzeFileWithTreeSitter(
      filePath,
      'module App\nend\n',
      workspaceRoot,
      { includeSymbols: false },
    );

    expect(result?.symbols).toEqual([]);
  });

  it('extracts Ruby require relationships, simple inheritance, and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'lib/base/base_runner.rb': 'class BaseRunner\nend\n',
      'lib/model/user.rb': 'class User\nend\n',
    });
    const runnerPath = path.join(workspaceRoot, 'lib/app/runner.rb');
    const source = [
      "require_relative '../base/base_runner'",
      "require_relative '../model/user'",
      "require 'json'",
      '',
      'module App',
      '  class Runner < BaseRunner',
      '    def run(user)',
      '      user.name',
      '    end',
      '',
      '    def call(user = User.new)',
      '      run(user)',
      '    end',
      '  end',
      'end',
      '',
      'def boot',
      '  App::Runner.new',
      'end',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(runnerPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: '../base/base_runner',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'lib/base/base_runner.rb'),
        toFilePath: path.join(workspaceRoot, 'lib/base/base_runner.rb'),
      }),
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: 'json',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'core:treesitter:inherit',
        specifier: 'BaseRunner',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'lib/base/base_runner.rb'),
        toFilePath: path.join(workspaceRoot, 'lib/base/base_runner.rb'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: '../model/user',
        fromFilePath: runnerPath,
        fromSymbolId: `${runnerPath}:method:call`,
        resolvedPath: path.join(workspaceRoot, 'lib/model/user.rb'),
        toFilePath: path.join(workspaceRoot, 'lib/model/user.rb'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'module', name: 'App' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'class', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'method', name: 'run' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
    ]));
  });
});
