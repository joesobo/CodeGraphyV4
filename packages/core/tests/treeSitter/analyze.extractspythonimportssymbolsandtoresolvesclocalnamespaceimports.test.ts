import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analyzeFileWithTreeSitter
} from '../../src/treeSitter/runtime/analyze';
import { preAnalyzeCSharpTreeSitterFiles } from '../../src/treeSitter/runtime/csharpIndex';

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
            edgeType: 'import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'pkg/thing.py'), pathKind: 'absolute', specifier: '.pkg.thing' },
            sourceId: 'codegraphy.treesitter:import',
            pluginId: 'codegraphy.treesitter',
          }),
          expect.objectContaining({
            edgeType: 'import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'unresolved', specifier: 'os' },
            sourceId: 'codegraphy.treesitter:import',
            pluginId: 'codegraphy.treesitter',
          }),
          expect.objectContaining({
            edgeType: 'call',
            from: expect.objectContaining({ kind: 'symbol', symbolId: expect.stringContaining(`${appPath}:method:run`), filePath: appPath }),
            target: { kind: 'file', path: path.join(workspaceRoot, 'pkg/thing.py'), pathKind: 'absolute', specifier: '.pkg.thing' },
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
            edgeType: 'import',
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/services/api.py'), pathKind: 'absolute', specifier: 'services.api.fetch_data' },
          }),
          expect.objectContaining({
            edgeType: 'call',
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/services/api.py'), pathKind: 'absolute', specifier: 'services.api.fetch_data' },
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
            edgeType: 'import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/util.rs'), pathKind: 'absolute', specifier: 'crate::util::run' },
            sourceId: 'codegraphy.treesitter:import',
          }),
          expect.objectContaining({
            edgeType: 'import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'unresolved', specifier: 'serde::Deserialize' },
            sourceId: 'codegraphy.treesitter:import',
          }),
          expect.objectContaining({
            edgeType: 'import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/inner.rs'), pathKind: 'absolute', specifier: 'inner' },
            sourceId: 'codegraphy.treesitter:import',
          }),
          expect.objectContaining({
            edgeType: 'call',
            from: expect.objectContaining({ kind: 'symbol', symbolId: expect.stringContaining(`${appPath}:function:main`), filePath: appPath }),
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/util.rs'), pathKind: 'absolute', specifier: 'crate::util::run' },
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
            edgeType: 'import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'unresolved', specifier: 'fmt' },
            sourceId: 'codegraphy.treesitter:import',
          }),
          expect.objectContaining({
            edgeType: 'call',
            from: expect.objectContaining({ kind: 'symbol', symbolId: expect.stringContaining(`${appPath}:function:run`), filePath: appPath }),
            target: { kind: 'unresolved', specifier: 'fmt' },
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
            edgeType: 'import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'unresolved', specifier: 'my.lib.Service' },
            sourceId: 'codegraphy.treesitter:import',
          }),
          expect.objectContaining({
            edgeType: 'inherit',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'unresolved', specifier: 'Base' },
            sourceId: 'codegraphy.treesitter:inherit',
          }),
          expect.objectContaining({
            edgeType: 'call',
            from: expect.objectContaining({ kind: 'symbol', symbolId: expect.stringContaining(`${appPath}:method:run`), filePath: appPath }),
            target: { kind: 'unresolved', specifier: 'my.lib.Service' },
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
            edgeType: 'import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'unresolved', specifier: 'System.Text' },
            sourceId: 'codegraphy.treesitter:import',
          }),
          expect.objectContaining({
            edgeType: 'inherit',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'unresolved', specifier: 'BaseApp' },
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
            edgeType: 'import',
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/Services/ApiService.cs'), pathKind: 'absolute', specifier: 'MyApp.Services' },
            sourceId: 'codegraphy.treesitter:import',
          }),
          expect.objectContaining({
            edgeType: 'import',
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/Utils/Helpers.cs'), pathKind: 'absolute', specifier: 'MyApp.Utils' },
            sourceId: 'codegraphy.treesitter:import',
          }),
          expect.objectContaining({
            edgeType: 'reference',
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/Config.cs'), pathKind: 'absolute', specifier: 'Config' },
            sourceId: 'codegraphy.treesitter:reference',
          }),
          expect.objectContaining({
            edgeType: 'reference',
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/Services/ApiService.cs'), pathKind: 'absolute', specifier: 'ApiService' },
            sourceId: 'codegraphy.treesitter:reference',
          }),
          expect.objectContaining({
            edgeType: 'reference',
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/Utils/Helpers.cs'), pathKind: 'absolute', specifier: 'Helpers' },
            sourceId: 'codegraphy.treesitter:reference',
          }),
        ]),
      );
    });
});
