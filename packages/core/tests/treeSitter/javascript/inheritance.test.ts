import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-js-inherit-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeJavaScript/inheritance', () => {
  it('extracts TypeScript class and interface inheritance relations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/baseRunner.ts': 'export class BaseRunner {}\n',
      'src/runnableThing.ts': 'export interface RunnableThing {}\n',
    });
    const filePath = path.join(workspaceRoot, 'src/runner.ts');
    const source = [
      "import { BaseRunner } from './baseRunner';",
      "import type { RunnableThing } from './runnableThing';",
      '',
      'export class AppRunner extends BaseRunner implements RunnableThing {',
      '  run(): string {',
      "    return 'ready';",
      '  }',
      '}',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'BaseRunner',
        fromSymbolId: `${filePath}:class:AppRunner`,
        resolvedPath: path.join(workspaceRoot, 'src/baseRunner.ts'),
      }),
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'RunnableThing',
        fromSymbolId: `${filePath}:class:AppRunner`,
        resolvedPath: path.join(workspaceRoot, 'src/runnableThing.ts'),
      }),
    ]));
  });

  it('extracts TypeScript interface extends relations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/inheritance.ts': 'export interface DisplayEntity { name: string; }\n',
    });
    const filePath = path.join(workspaceRoot, 'src/types.ts');
    const source = [
      "import type { DisplayEntity } from './inheritance';",
      '',
      'export interface UserProfile extends DisplayEntity {',
      '  role: string;',
      '}',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'DisplayEntity',
        fromSymbolId: `${filePath}:interface:UserProfile`,
        resolvedPath: path.join(workspaceRoot, 'src/inheritance.ts'),
      }),
    ]));
  });
});
