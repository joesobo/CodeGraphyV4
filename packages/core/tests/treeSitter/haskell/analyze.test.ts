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
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'App.Model.User',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'src/App/Model/User.hs'),
        toFilePath: path.join(workspaceRoot, 'src/App/Model/User.hs'),
      }),
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'Data.Text',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'module', name: 'App.Feature.Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'data', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
    ]));
  });

  it('extracts Haskell calls to imported functions and constructors', async () => {
    const workspaceRoot = await createWorkspace({
      'src/App/Feature/Runner.hs': [
        'module App.Feature.Runner where',
        'boot user = user',
        '',
      ].join('\n'),
      'src/App/Model/User.hs': [
        'module App.Model.User where',
        'data User = User String',
        '',
      ].join('\n'),
    });
    const mainPath = path.join(workspaceRoot, 'src/Main.hs');
    const source = [
      'module Main where',
      '',
      'import App.Feature.Runner',
      'import App.Model.User',
      '',
      'main :: IO ()',
      'main = print (boot (User "Ada"))',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'boot',
        fromFilePath: mainPath,
        fromSymbolId: `${mainPath}:function:main`,
        resolvedPath: path.join(workspaceRoot, 'src/App/Feature/Runner.hs'),
        toFilePath: path.join(workspaceRoot, 'src/App/Feature/Runner.hs'),
      }),
      expect.objectContaining({
        kind: 'call',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'User',
        fromFilePath: mainPath,
        fromSymbolId: `${mainPath}:function:main`,
        resolvedPath: path.join(workspaceRoot, 'src/App/Model/User.hs'),
        toFilePath: path.join(workspaceRoot, 'src/App/Model/User.hs'),
      }),
    ]));
  });
});
