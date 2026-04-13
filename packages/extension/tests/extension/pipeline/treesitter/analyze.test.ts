import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../../src/extension/pipeline/treesitter/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-'));
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

describe('pipeline/treesitter/analyze', () => {
  it('returns null for unsupported files', async () => {
    await expect(
      analyzeFileWithTreeSitter(
        '/workspace/styles.css',
        '.app { color: red; }',
        '/workspace',
      ),
    ).resolves.toBeNull();
  });

  it('extracts symbols plus import, reexport, require, dynamic-import, and imported-call relations for TypeScript files', async () => {
    const workspaceRoot = await createWorkspace({
      'src/lib.ts': 'export function boot() { return true; }\n',
      'src/helper.ts': 'export const helper = true;\n',
    });
    const appPath = path.join(workspaceRoot, 'src/app.ts');
    const appSource = [
      "import { boot } from './lib';",
      "import { readFileSync } from 'node:fs';",
      "export { helper } from './helper';",
      "const lazy = import('./helper');",
      "const legacy = require('./lib');",
      'function run() {',
      "  boot();",
      "  readFileSync('package.json');",
      '}',
      'class Service {',
      '  start() {',
      '    boot();',
      '  }',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'run',
          kind: 'function',
          filePath: appPath,
        }),
        expect.objectContaining({
          name: 'Service',
          kind: 'class',
          filePath: appPath,
        }),
        expect.objectContaining({
          name: 'start',
          kind: 'method',
          filePath: appPath,
        }),
      ]),
    );
    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          pluginId: 'codegraphy.core.treesitter',
          specifier: './lib',
          resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/lib.ts'),
          sourceId: 'codegraphy.core.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'import',
          pluginId: 'codegraphy.core.treesitter',
          specifier: 'node:fs',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.core.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'reexport',
          pluginId: 'codegraphy.core.treesitter',
          specifier: './helper',
          resolvedPath: path.join(workspaceRoot, 'src/helper.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/helper.ts'),
          sourceId: 'codegraphy.core.treesitter:reexport',
        }),
        expect.objectContaining({
          kind: 'import',
          pluginId: 'codegraphy.core.treesitter',
          specifier: './helper',
          resolvedPath: path.join(workspaceRoot, 'src/helper.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/helper.ts'),
          type: 'dynamic',
          sourceId: 'codegraphy.core.treesitter:dynamic-import',
        }),
        expect.objectContaining({
          kind: 'import',
          pluginId: 'codegraphy.core.treesitter',
          specifier: './lib',
          resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/lib.ts'),
          type: 'require',
          sourceId: 'codegraphy.core.treesitter:commonjs-require',
        }),
        expect.objectContaining({
          kind: 'call',
          pluginId: 'codegraphy.core.treesitter',
          specifier: './lib',
          resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/lib.ts'),
          fromSymbolId: expect.stringContaining(`${appPath}:function:run`),
          sourceId: 'codegraphy.core.treesitter:call',
        }),
        expect.objectContaining({
          kind: 'call',
          pluginId: 'codegraphy.core.treesitter',
          specifier: './lib',
          resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/lib.ts'),
          fromSymbolId: expect.stringContaining(`${appPath}:method:start`),
          sourceId: 'codegraphy.core.treesitter:call',
        }),
      ]),
    );
  });

  it('extracts symbols from arrow function and function expression variable declarations', async () => {
    const workspaceRoot = await createWorkspace({});
    const filePath = path.join(workspaceRoot, 'src/createFolder.ts');
    const source = [
      'export const createFolder = async () => {',
      '  return true;',
      '};',
      '',
      'const removeFolder = function () {',
      '  return false;',
      '};',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'createFolder',
          kind: 'function',
          filePath,
        }),
        expect.objectContaining({
          name: 'removeFolder',
          kind: 'function',
          filePath,
        }),
      ]),
    );
    expect(result?.symbols).toHaveLength(2);
  });

  it('extracts Python imports, symbols, and imported-call relations', async () => {
    const workspaceRoot = await createWorkspace({
      'pkg/thing.py': 'def run():\n    return True\n',
    });
    const appPath = path.join(workspaceRoot, 'app.py');
    const appSource = [
      'from .pkg import thing',
      'import os',
      'class App:',
      '    def run(self):',
      '        thing.run()',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result?.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'App', kind: 'class', filePath: appPath }),
        expect.objectContaining({ name: 'run', kind: 'method', filePath: appPath }),
      ]),
    );
    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: '.pkg.thing',
          resolvedPath: path.join(workspaceRoot, 'pkg/thing.py'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'pkg/thing.py'),
          sourceId: 'codegraphy.core.treesitter:import',
          pluginId: 'codegraphy.core.treesitter',
        }),
        expect.objectContaining({
          kind: 'import',
          specifier: 'os',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.core.treesitter:import',
          pluginId: 'codegraphy.core.treesitter',
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: '.pkg.thing',
          resolvedPath: path.join(workspaceRoot, 'pkg/thing.py'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'pkg/thing.py'),
          fromSymbolId: expect.stringContaining(`${appPath}:method:run`),
          sourceId: 'codegraphy.core.treesitter:call',
          pluginId: 'codegraphy.core.treesitter',
        }),
      ]),
    );
  });

  it('extracts Rust imports, module declarations, symbols, and imported-call relations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/util.rs': 'pub fn run() {}\n',
      'src/inner.rs': 'pub fn helper() {}\n',
    });
    const appPath = path.join(workspaceRoot, 'src/main.rs');
    const appSource = [
      'use crate::util::run;',
      'use serde::Deserialize;',
      'mod inner;',
      'fn main() {',
      '  run();',
      '}',
      'struct App;',
      'enum Status { Ready }',
      'trait Service {}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result?.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'main', kind: 'function', filePath: appPath }),
        expect.objectContaining({ name: 'App', kind: 'struct', filePath: appPath }),
        expect.objectContaining({ name: 'Status', kind: 'enum', filePath: appPath }),
        expect.objectContaining({ name: 'Service', kind: 'trait', filePath: appPath }),
      ]),
    );
    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: 'crate::util::run',
          resolvedPath: path.join(workspaceRoot, 'src/util.rs'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/util.rs'),
          sourceId: 'codegraphy.core.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'import',
          specifier: 'serde::Deserialize',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.core.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'import',
          specifier: 'inner',
          resolvedPath: path.join(workspaceRoot, 'src/inner.rs'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/inner.rs'),
          sourceId: 'codegraphy.core.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: 'crate::util::run',
          resolvedPath: path.join(workspaceRoot, 'src/util.rs'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/util.rs'),
          fromSymbolId: expect.stringContaining(`${appPath}:function:main`),
          sourceId: 'codegraphy.core.treesitter:call',
        }),
      ]),
    );
  });

  it('extracts Go imports, type declarations, and imported-call relations', async () => {
    const workspaceRoot = await createWorkspace({});
    const appPath = path.join(workspaceRoot, 'main.go');
    const appSource = [
      'package main',
      'import fmt "fmt"',
      'func run() {',
      '  fmt.Println("hi")',
      '}',
      'type Service struct {}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result?.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'run', kind: 'function', filePath: appPath }),
        expect.objectContaining({ name: 'Service', kind: 'struct', filePath: appPath }),
      ]),
    );
    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: 'fmt',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.core.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: 'fmt',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          fromSymbolId: expect.stringContaining(`${appPath}:function:run`),
          sourceId: 'codegraphy.core.treesitter:call',
        }),
      ]),
    );
  });

  it('extracts Java imports, inheritance, and imported-call relations', async () => {
    const workspaceRoot = await createWorkspace({});
    const appPath = path.join(workspaceRoot, 'App.java');
    const appSource = [
      'import my.lib.Service;',
      'class App extends Base {',
      '  void run() {',
      '    Service.start();',
      '  }',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result?.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'App', kind: 'class', filePath: appPath }),
        expect.objectContaining({ name: 'run', kind: 'method', filePath: appPath }),
      ]),
    );
    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: 'my.lib.Service',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.core.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'inherit',
          specifier: 'Base',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.core.treesitter:inherit',
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: 'my.lib.Service',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          fromSymbolId: expect.stringContaining(`${appPath}:method:run`),
          sourceId: 'codegraphy.core.treesitter:call',
        }),
      ]),
    );
  });

  it('extracts C# imports, type symbols, and inheritance', async () => {
    const workspaceRoot = await createWorkspace({});
    const appPath = path.join(workspaceRoot, 'App.cs');
    const appSource = [
      'using System.Text;',
      'interface IRunner {}',
      'struct Payload {}',
      'enum Status { Ready }',
      'class App : BaseApp {',
      '  void Run() {}',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result?.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'IRunner', kind: 'interface', filePath: appPath }),
        expect.objectContaining({ name: 'Payload', kind: 'struct', filePath: appPath }),
        expect.objectContaining({ name: 'Status', kind: 'enum', filePath: appPath }),
        expect.objectContaining({ name: 'App', kind: 'class', filePath: appPath }),
        expect.objectContaining({ name: 'Run', kind: 'method', filePath: appPath }),
      ]),
    );
    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: 'System.Text',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.core.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'inherit',
          specifier: 'BaseApp',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.core.treesitter:inherit',
        }),
      ]),
    );
  });
});
