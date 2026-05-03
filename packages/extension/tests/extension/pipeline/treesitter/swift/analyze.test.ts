import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-swift-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeSwift', () => {
  it('extracts Swift module imports, simple inheritance, and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'Package.swift': [
        '// swift-tools-version: 5.9',
        'import PackageDescription',
        'let package = Package(',
        '  name: "SwiftExample",',
        '  targets: [',
        '    .executableTarget(name: "App", dependencies: ["LocalKit"]),',
        '    .target(name: "LocalKit")',
        '  ]',
        ')',
        '',
      ].join('\n'),
      'Sources/LocalKit/Worker.swift': [
        'public protocol Runnable {}',
        'open class BaseRunner {}',
        '',
      ].join('\n'),
    });
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
        resolvedPath: path.join(workspaceRoot, 'Sources/LocalKit/Worker.swift'),
        toFilePath: path.join(workspaceRoot, 'Sources/LocalKit/Worker.swift'),
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
