import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-java-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeJava', () => {
  it('exports class extends relationships as symbol inheritance without file-level edges', async () => {
    const workspaceRoot = await createWorkspace({
      'src/com/example/app/BaseService.java': [
        'package com.example.app;',
        '',
        'public class BaseService {}',
        '',
      ].join('\n'),
    });
    const appPath = path.join(workspaceRoot, 'src/com/example/app/App.java');
    const baseServicePath = path.join(workspaceRoot, 'src/com/example/app/BaseService.java');
    const appSource = [
      'package com.example.app;',
      '',
      'public class App extends BaseService {}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, appSource, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'codegraphy.treesitter:inherit',
        pluginId: 'codegraphy.treesitter',
        specifier: 'BaseService',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:class:App`,
        toSymbolId: `${baseServicePath}:class:BaseService`,
      }),
    ]));
    const inheritRelation = result?.relations?.find((relation) => relation.kind === 'inherit');
    expect(inheritRelation).not.toHaveProperty('toFilePath');
    expect(inheritRelation).not.toHaveProperty('resolvedPath');
  });
});
