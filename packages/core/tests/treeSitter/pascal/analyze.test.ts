import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-pascal-'));
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

describe('treeSitter/analyzePascal', () => {
  it('extracts Pascal unit uses relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/RunnerSupport.pas': [
        'unit RunnerSupport;',
        'interface',
        'type',
        '  TBaseRunner = class',
        '  end;',
        'implementation',
        'end.',
      ].join('\n'),
    });
    const filePath = path.join(workspaceRoot, 'src/SampleApp.pas');
    const source = [
      'unit SampleApp;',
      'interface',
      'uses RunnerSupport;',
      'type',
      '  TAppRunner = class(TBaseRunner)',
      '  public',
      '    procedure Run;',
      '  end;',
      'implementation',
      'procedure TAppRunner.Run;',
      'begin',
      'end;',
      'end.',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'RunnerSupport',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/RunnerSupport.pas'),
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'TBaseRunner',
        fromFilePath: filePath,
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath, kind: 'class', name: 'TAppRunner' }),
      expect.objectContaining({ filePath, kind: 'method', name: 'Run' }),
    ]));
  });
});
