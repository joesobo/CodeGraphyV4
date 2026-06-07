import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-c-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeC', () => {
  it('extracts C include relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/math/add.h': [
        '#pragma once',
        'int add(int left, int right);',
        '',
      ].join('\n'),
    });
    const mainPath = path.join(workspaceRoot, 'src/main.c');
    const source = [
      '#include "math/add.h"',
      '#include <stdio.h>',
      '',
      'typedef struct Counter {',
      '  int value;',
      '} Counter;',
      '',
      'enum Mode {',
      '  MODE_FAST',
      '};',
      '',
      'static int helper(void) {',
      '  return add(1, 2);',
      '}',
      '',
      'int main(void) {',
      '  return helper();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:include',
        type: 'include',
        specifier: 'math/add.h',
        fromFilePath: mainPath,
        resolvedPath: path.join(workspaceRoot, 'src/math/add.h'),
        toFilePath: path.join(workspaceRoot, 'src/math/add.h'),
      }),
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:include',
        type: 'include',
        specifier: 'stdio.h',
        fromFilePath: mainPath,
        resolvedPath: null,
        toFilePath: null,
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: mainPath, kind: 'struct', name: 'Counter' }),
      expect.objectContaining({ filePath: mainPath, kind: 'enum', name: 'Mode' }),
      expect.objectContaining({ filePath: mainPath, kind: 'function', name: 'helper' }),
      expect.objectContaining({ filePath: mainPath, kind: 'function', name: 'main' }),
    ]));
  });

  it('extracts C calls to included declarations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/math/add.h': [
        '#pragma once',
        'int add(int left, int right);',
        '',
      ].join('\n'),
    });
    const mainPath = path.join(workspaceRoot, 'src/main.c');
    const source = [
      '#include "math/add.h"',
      '',
      'int main(void) {',
      '  return add(1, 2);',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'add',
        fromFilePath: mainPath,
        fromSymbolId: `${mainPath}:function:main`,
        resolvedPath: path.join(workspaceRoot, 'src/math/add.h'),
        toFilePath: path.join(workspaceRoot, 'src/math/add.h'),
      }),
    ]));
  });

  it('does not turn unmatched C calls into edges to the only included header', async () => {
    const workspaceRoot = await createWorkspace({
      'src/math/add.h': [
        '#pragma once',
        'int add(int left, int right);',
        '',
      ].join('\n'),
    });
    const mainPath = path.join(workspaceRoot, 'src/main.c');
    const source = [
      '#include "math/add.h"',
      '',
      'static int helper(void) {',
      '  return 1;',
      '}',
      '',
      'int main(void) {',
      '  return helper();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result?.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        specifier: 'helper',
        resolvedPath: path.join(workspaceRoot, 'src/math/add.h'),
      }),
    ]));
  });
});
