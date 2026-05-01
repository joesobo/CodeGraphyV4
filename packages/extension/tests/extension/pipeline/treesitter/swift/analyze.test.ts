import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze';

describe('pipeline/plugins/treesitter/runtime/analyzeSwift', () => {
  it('extracts Swift module imports, simple inheritance, and useful symbols', async () => {
    const workspaceRoot = '/workspace';
    const runnerPath = path.join(workspaceRoot, 'Sources/App/Runner.swift');
    const source = [
      'import Foundation',
      'import LocalKit',
      '',
      'protocol Runnable {}',
      'class BaseRunner {}',
      'struct User {',
      '  let name: String',
      '}',
      '',
      'class Runner: BaseRunner, Runnable {',
      '  func run(user: User) -> String {',
      '    user.name',
      '  }',
      '}',
      '',
      'func boot() -> Runner {',
      '  Runner()',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(runnerPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'Foundation',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'LocalKit',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'inherit',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'BaseRunner',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'inherit',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'Runnable',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'protocol', name: 'Runnable' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'class', name: 'BaseRunner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'struct', name: 'User' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'class', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'method', name: 'run' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
    ]));
  });
});
