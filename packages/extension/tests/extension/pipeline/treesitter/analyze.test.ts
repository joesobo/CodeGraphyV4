import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze';
import { preAnalyzeCSharpTreeSitterFiles } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';

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

describe('pipeline/plugins/treesitter/runtime/analyze', () => {
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
          pluginId: 'codegraphy.treesitter',
          specifier: './lib',
          resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/lib.ts'),
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'import',
          pluginId: 'codegraphy.treesitter',
          specifier: 'node:fs',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'reexport',
          pluginId: 'codegraphy.treesitter',
          specifier: './helper',
          resolvedPath: path.join(workspaceRoot, 'src/helper.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/helper.ts'),
          sourceId: 'codegraphy.treesitter:reexport',
        }),
        expect.objectContaining({
          kind: 'import',
          pluginId: 'codegraphy.treesitter',
          specifier: './helper',
          resolvedPath: path.join(workspaceRoot, 'src/helper.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/helper.ts'),
          type: 'dynamic',
          sourceId: 'codegraphy.treesitter:dynamic-import',
        }),
        expect.objectContaining({
          kind: 'import',
          pluginId: 'codegraphy.treesitter',
          specifier: './lib',
          resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/lib.ts'),
          type: 'require',
          sourceId: 'codegraphy.treesitter:commonjs-require',
        }),
        expect.objectContaining({
          kind: 'call',
          pluginId: 'codegraphy.treesitter',
          specifier: './lib',
          resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/lib.ts'),
          fromSymbolId: expect.stringContaining(`${appPath}:function:run`),
          sourceId: 'codegraphy.treesitter:call',
        }),
        expect.objectContaining({
          kind: 'call',
          pluginId: 'codegraphy.treesitter',
          specifier: './lib',
          resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/lib.ts'),
          fromSymbolId: expect.stringContaining(`${appPath}:method:start`),
          sourceId: 'codegraphy.treesitter:call',
        }),
      ]),
    );
  });

  it('extracts TypeScript type-only imports as type-import relations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/runtime.ts': [
        'export interface RuntimeOptions { enabled: boolean }',
        'export function boot() { return true; }',
        '',
      ].join('\n'),
      'src/types.ts': 'export interface PluginContract { id: string }\n',
    });
    const appPath = path.join(workspaceRoot, 'src/app.ts');
    const appSource = [
      "import type { PluginContract } from './types';",
      "import { type RuntimeOptions, boot } from './runtime';",
      'const contract: PluginContract = { id: "plugin" };',
      'const options: RuntimeOptions = { enabled: boot() };',
      'void contract;',
      'void options;',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'type-import',
          pluginId: 'codegraphy.treesitter',
          specifier: './types',
          resolvedPath: path.join(workspaceRoot, 'src/types.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/types.ts'),
          sourceId: 'codegraphy.treesitter:type-import',
        }),
        expect.objectContaining({
          kind: 'type-import',
          pluginId: 'codegraphy.treesitter',
          specifier: './runtime',
          resolvedPath: path.join(workspaceRoot, 'src/runtime.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/runtime.ts'),
          sourceId: 'codegraphy.treesitter:type-import',
        }),
        expect.objectContaining({
          kind: 'import',
          pluginId: 'codegraphy.treesitter',
          specifier: './runtime',
          resolvedPath: path.join(workspaceRoot, 'src/runtime.ts'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/runtime.ts'),
          sourceId: 'codegraphy.treesitter:import',
        }),
      ]),
    );
    expect(result?.relations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: './types',
        }),
      ]),
    );
  });

  it('extracts TypeScript type alias, interface, and enum symbols', async () => {
    const workspaceRoot = await createWorkspace({});
    const filePath = path.join(workspaceRoot, 'src/types.ts');
    const source = [
      'export type UserName = string;',
      'export interface FullName {',
      '  first: string;',
      '  last: string;',
      '}',
      'export enum Role {',
      '  Admin = "admin",',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'UserName', kind: 'type', filePath }),
        expect.objectContaining({ name: 'FullName', kind: 'interface', filePath }),
        expect.objectContaining({ name: 'Role', kind: 'enum', filePath }),
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
          sourceId: 'codegraphy.treesitter:import',
          pluginId: 'codegraphy.treesitter',
        }),
        expect.objectContaining({
          kind: 'import',
          specifier: 'os',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.treesitter:import',
          pluginId: 'codegraphy.treesitter',
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: '.pkg.thing',
          resolvedPath: path.join(workspaceRoot, 'pkg/thing.py'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'pkg/thing.py'),
          fromSymbolId: expect.stringContaining(`${appPath}:method:run`),
          sourceId: 'codegraphy.treesitter:call',
          pluginId: 'codegraphy.treesitter',
        }),
      ]),
    );
  });

  it('resolves Python member imports back to the owning module file', async () => {
    const workspaceRoot = await createWorkspace({
      'src/services/api.py': 'def fetch_data():\n    return []\n',
    });
    const filePath = path.join(workspaceRoot, 'src/main.py');
    const source = 'from services.api import fetch_data\nfetch_data()\n';

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: 'services.api.fetch_data',
          resolvedPath: path.join(workspaceRoot, 'src/services/api.py'),
          toFilePath: path.join(workspaceRoot, 'src/services/api.py'),
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: 'services.api.fetch_data',
          resolvedPath: path.join(workspaceRoot, 'src/services/api.py'),
          toFilePath: path.join(workspaceRoot, 'src/services/api.py'),
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
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'import',
          specifier: 'serde::Deserialize',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'import',
          specifier: 'inner',
          resolvedPath: path.join(workspaceRoot, 'src/inner.rs'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/inner.rs'),
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: 'crate::util::run',
          resolvedPath: path.join(workspaceRoot, 'src/util.rs'),
          fromFilePath: appPath,
          toFilePath: path.join(workspaceRoot, 'src/util.rs'),
          fromSymbolId: expect.stringContaining(`${appPath}:function:main`),
          sourceId: 'codegraphy.treesitter:call',
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
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: 'fmt',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          fromSymbolId: expect.stringContaining(`${appPath}:function:run`),
          sourceId: 'codegraphy.treesitter:call',
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
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'inherit',
          specifier: 'Base',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.treesitter:inherit',
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: 'my.lib.Service',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          fromSymbolId: expect.stringContaining(`${appPath}:method:run`),
          sourceId: 'codegraphy.treesitter:call',
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
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'inherit',
          specifier: 'BaseApp',
          resolvedPath: null,
          fromFilePath: appPath,
          toFilePath: null,
          sourceId: 'codegraphy.treesitter:inherit',
        }),
      ]),
    );
  });

  it('resolves C# local namespace imports and type references after pre-analysis', async () => {
    const workspaceRoot = await createWorkspace({
      'src/Config.cs': [
        'namespace MyApp;',
        'public class Config {',
        '  public static Config LoadConfig() => new();',
        '}',
        '',
      ].join('\n'),
      'src/Services/ApiService.cs': [
        'namespace MyApp.Services;',
        'public class ApiService {}',
        '',
      ].join('\n'),
      'src/Utils/Helpers.cs': [
        'namespace MyApp.Utils;',
        'public static class Helpers {',
        '  public static string Format(string value) => value;',
        '}',
        '',
      ].join('\n'),
    });
    const appPath = path.join(workspaceRoot, 'src/Program.cs');
    const appSource = [
      'using MyApp.Services;',
      'using MyApp.Utils;',
      'namespace MyApp;',
      'class Program {',
      '  void Run() {',
      '    var config = Config.LoadConfig();',
      '    var api = new ApiService();',
      '    Helpers.Format("ok");',
      '  }',
      '}',
      '',
    ].join('\n');

    await preAnalyzeCSharpTreeSitterFiles(
      [
        {
          absolutePath: path.join(workspaceRoot, 'src/Config.cs'),
          content: await fs.readFile(path.join(workspaceRoot, 'src/Config.cs'), 'utf8'),
        },
        {
          absolutePath: path.join(workspaceRoot, 'src/Services/ApiService.cs'),
          content: await fs.readFile(path.join(workspaceRoot, 'src/Services/ApiService.cs'), 'utf8'),
        },
        {
          absolutePath: path.join(workspaceRoot, 'src/Utils/Helpers.cs'),
          content: await fs.readFile(path.join(workspaceRoot, 'src/Utils/Helpers.cs'), 'utf8'),
        },
        {
          absolutePath: appPath,
          content: appSource,
        },
      ],
      workspaceRoot,
    );

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: 'MyApp.Services',
          resolvedPath: path.join(workspaceRoot, 'src/Services/ApiService.cs'),
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'import',
          specifier: 'MyApp.Utils',
          resolvedPath: path.join(workspaceRoot, 'src/Utils/Helpers.cs'),
          sourceId: 'codegraphy.treesitter:import',
        }),
        expect.objectContaining({
          kind: 'reference',
          specifier: 'Config',
          resolvedPath: path.join(workspaceRoot, 'src/Config.cs'),
          sourceId: 'codegraphy.treesitter:reference',
        }),
        expect.objectContaining({
          kind: 'reference',
          specifier: 'ApiService',
          resolvedPath: path.join(workspaceRoot, 'src/Services/ApiService.cs'),
          sourceId: 'codegraphy.treesitter:reference',
        }),
        expect.objectContaining({
          kind: 'reference',
          specifier: 'Helpers',
          resolvedPath: path.join(workspaceRoot, 'src/Utils/Helpers.cs'),
          sourceId: 'codegraphy.treesitter:reference',
        }),
      ]),
    );
  });
});
