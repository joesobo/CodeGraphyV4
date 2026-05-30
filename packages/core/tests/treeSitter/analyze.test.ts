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
            edgeType: 'import',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/lib.ts'), pathKind: 'absolute', specifier: './lib' },
          }),
          expect.objectContaining({
            edgeType: 'import',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'unresolved', specifier: 'node:fs' },
          }),
          expect.objectContaining({
            edgeType: 'reexport',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:reexport',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/helper.ts'), pathKind: 'absolute', specifier: './helper' },
          }),
          expect.objectContaining({
            edgeType: 'import',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:dynamic-import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/helper.ts'), pathKind: 'absolute', specifier: './helper' },
            timing: 'dynamic',
          }),
          expect.objectContaining({
            edgeType: 'import',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:commonjs-require',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/lib.ts'), pathKind: 'absolute', specifier: './lib' },
            timing: 'require',
          }),
          expect.objectContaining({
            edgeType: 'call',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:call',
            from: expect.objectContaining({ kind: 'symbol', symbolId: expect.stringContaining(`${appPath}:function:run`), filePath: appPath }),
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/lib.ts'), pathKind: 'absolute', specifier: './lib' },
          }),
          expect.objectContaining({
            edgeType: 'call',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:call',
            from: expect.objectContaining({ kind: 'symbol', symbolId: expect.stringContaining(`${appPath}:method:start`), filePath: appPath }),
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/lib.ts'), pathKind: 'absolute', specifier: './lib' },
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
            edgeType: 'type-import',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:type-import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/types.ts'), pathKind: 'absolute', specifier: './types' },
          }),
          expect.objectContaining({
            edgeType: 'type-import',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:type-import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/runtime.ts'), pathKind: 'absolute', specifier: './runtime' },
          }),
          expect.objectContaining({
            edgeType: 'import',
            pluginId: 'codegraphy.treesitter',
            sourceId: 'codegraphy.treesitter:import',
            from: { kind: 'file', filePath: appPath },
            target: { kind: 'file', path: path.join(workspaceRoot, 'src/runtime.ts'), pathKind: 'absolute', specifier: './runtime' },
          }),
        ]),
      );
      expect(result?.relations).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            edgeType: 'import',
            target: expect.objectContaining({ specifier: './types' }),
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
