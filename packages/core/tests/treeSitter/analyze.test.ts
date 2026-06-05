import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analyzeFileWithTreeSitter,
  analyzeTreeSitterTree,
} from '../../src/treeSitter/runtime/analyze';

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



    it('returns null when a parser runtime has no language analyzer', () => {
      expect(
        analyzeTreeSitterTree(
          '/workspace/source.unknown',
          { rootNode: {} } as never,
          '/workspace',
          'unknown',
        ),
      ).toBeNull();
    });



    it('extracts symbols plus import, export-from import, require, dynamic-import, and imported-call relations for TypeScript files', async () => {
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
            kind: 'import',
            pluginId: 'codegraphy.treesitter',
            specifier: './helper',
            resolvedPath: path.join(workspaceRoot, 'src/helper.ts'),
            fromFilePath: appPath,
            toFilePath: path.join(workspaceRoot, 'src/helper.ts'),
            sourceId: 'codegraphy.treesitter:import',
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

    it('skips TypeScript symbols when relation-only analysis is requested', async () => {
      const workspaceRoot = await createWorkspace({
        'src/lib.ts': 'export function boot() { return true; }\n',
      });
      const appPath = path.join(workspaceRoot, 'src/app.ts');
      const appSource = [
        "import { boot } from './lib';",
        'function run() {',
        '  boot();',
        '}',
        '',
      ].join('\n');

      const result = await analyzeFileWithTreeSitter(
        appPath,
        appSource,
        workspaceRoot,
        { includeSymbols: false },
      );

      expect(result).not.toBeNull();
      expect(result?.symbols).toEqual([]);
      expect(result?.relations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'import',
            specifier: './lib',
            resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          }),
          expect.objectContaining({
            kind: 'call',
            sourceId: 'codegraphy.treesitter:call',
            resolvedPath: path.join(workspaceRoot, 'src/lib.ts'),
          }),
        ]),
      );
      expect(result?.relations?.some(relation =>
        Boolean(relation.fromSymbolId || relation.toSymbolId),
      )).toBe(false);
    });

    it('keeps Java file-view relations to imports, calls, and inheritance without symbol endpoints', async () => {
      const workspaceRoot = await createWorkspace({
        'src/com/example/app/BaseService.java': [
          'package com.example.app;',
          '',
          'public class BaseService {',
          '  public void start() {}',
          '}',
          '',
        ].join('\n'),
        'src/com/example/app/Helper.java': [
          'package com.example.app;',
          '',
          'public class Helper {',
          '  public static void ping() {}',
          '}',
          '',
        ].join('\n'),
      });
      const appPath = path.join(workspaceRoot, 'src/com/example/app/App.java');
      const helperPath = path.join(workspaceRoot, 'src/com/example/app/Helper.java');
      const baseServicePath = path.join(workspaceRoot, 'src/com/example/app/BaseService.java');
      const appSource = [
        'package com.example.app;',
        '',
        'import com.example.app.Helper;',
        '',
        'public class App extends BaseService {',
        '  public void run() {',
        '    Helper.ping();',
        '  }',
        '}',
        '',
      ].join('\n');

      const result = await analyzeFileWithTreeSitter(
        appPath,
        appSource,
        workspaceRoot,
        { includeSymbols: false },
      );

      expect(result).not.toBeNull();
      expect(result?.symbols).toEqual([]);
      expect(result?.relations).toHaveLength(3);
      expect(result?.relations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          specifier: 'com.example.app.Helper',
          resolvedPath: helperPath,
          toFilePath: helperPath,
        }),
        expect.objectContaining({
          kind: 'call',
          specifier: 'com.example.app.Helper',
          resolvedPath: helperPath,
          toFilePath: helperPath,
        }),
        expect.objectContaining({
          kind: 'inherit',
          specifier: 'BaseService',
          resolvedPath: baseServicePath,
          toFilePath: baseServicePath,
        }),
      ]));
      expect(result?.relations?.some(relation =>
        Boolean(relation.fromSymbolId || relation.toSymbolId),
      )).toBe(false);
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



    it('extracts ordinary const declarations as constant symbols', async () => {
      const workspaceRoot = await createWorkspace({});
      const filePath = path.join(workspaceRoot, 'src/state.ts');
      const source = [
        'export const activeUserName = "CodeGraphy";',
        '',
        'const createGreeting = () => activeUserName;',
        '',
      ].join('\n');

      const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

      expect(result?.symbols).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'activeUserName',
            kind: 'constant',
            filePath,
          }),
          expect.objectContaining({
            name: 'createGreeting',
            kind: 'function',
            filePath,
          }),
        ]),
      );
      expect(result?.symbols).toHaveLength(2);
    });
});
