import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-haskell-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeHaskell', () => {
  it('extracts Haskell import relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/App/Model/User.hs': [
        'module App.Model.User where',
        'data User = User String',
        '',
      ].join('\n'),
    });
    const runnerPath = path.join(workspaceRoot, 'src/App/Feature/Runner.hs');
    const source = [
      'module App.Feature.Runner (Runner(..), boot) where',
      '',
      'import App.Model.User',
      'import qualified Data.Text as Text',
      '',
      'data Runner = Runner User',
      '',
      'boot :: User -> Runner',
      'boot user = Runner user',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(runnerPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        edgeType: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        from: { kind: 'file', filePath: runnerPath },
        target: { kind: 'file', path: path.join(workspaceRoot, 'src/App/Model/User.hs'), pathKind: 'absolute', specifier: 'App.Model.User' },
      }),
      expect.objectContaining({
        edgeType: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        from: { kind: 'file', filePath: runnerPath },
        target: { kind: 'unresolved', specifier: 'Data.Text' },
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'module', name: 'App.Feature.Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'data', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
    ]));
  });
});
