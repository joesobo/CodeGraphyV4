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
        edgeType: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        from: { kind: 'file', filePath: runnerPath },
        target: { kind: 'file', path: path.join(workspaceRoot, 'lib/base/base_runner.rb'), pathKind: 'absolute', specifier: '../base/base_runner' },
      }),
      expect.objectContaining({
        edgeType: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        from: { kind: 'file', filePath: runnerPath },
        target: { kind: 'unresolved', specifier: 'json' },
      }),
      expect.objectContaining({
        edgeType: 'inherit',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:inherit',
        from: { kind: 'file', filePath: runnerPath },
        target: { kind: 'file', path: path.join(workspaceRoot, 'lib/base/base_runner.rb'), pathKind: 'absolute', specifier: 'BaseRunner' },
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
