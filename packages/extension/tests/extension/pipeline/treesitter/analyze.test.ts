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

  it('extracts symbols plus import, reexport, and imported-call relations for TypeScript files', async () => {
    const workspaceRoot = await createWorkspace({
      'src/lib.ts': 'export function boot() { return true; }\n',
      'src/helper.ts': 'export const helper = true;\n',
    });
    const appPath = path.join(workspaceRoot, 'src/app.ts');
    const appSource = [
      "import { boot } from './lib';",
      "import { readFileSync } from 'node:fs';",
      "export { helper } from './helper';",
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
});
