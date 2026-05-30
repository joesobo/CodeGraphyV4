import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-cpp-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeCpp', () => {
  it('extracts C++ include relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/lib/widget.hpp': [
        '#pragma once',
        'class Widget {',
        'public:',
        '  virtual void render();',
        '};',
        '',
      ].join('\n'),
    });
    const appPath = path.join(workspaceRoot, 'src/app.cpp');
    const source = [
      '#include "lib/widget.hpp"',
      '#include <vector>',
      '',
      'namespace app {',
      'class Runner : public Widget {',
      'public:',
      '  void run() {}',
      '};',
      '',
      'int boot() {',
      '  Runner runner;',
      '  runner.run();',
      '  return 0;',
      '}',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        edgeType: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:include',
        timing: 'include',
        from: { kind: 'file', filePath: appPath },
        target: { kind: 'file', path: path.join(workspaceRoot, 'src/lib/widget.hpp'), pathKind: 'absolute', specifier: 'lib/widget.hpp' },
      }),
      expect.objectContaining({
        edgeType: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:include',
        timing: 'include',
        from: { kind: 'file', filePath: appPath },
        target: { kind: 'unresolved', specifier: 'vector' },
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: appPath, kind: 'namespace', name: 'app' }),
      expect.objectContaining({ filePath: appPath, kind: 'class', name: 'Runner' }),
      expect.objectContaining({ filePath: appPath, kind: 'method', name: 'run' }),
      expect.objectContaining({ filePath: appPath, kind: 'function', name: 'boot' }),
    ]));
  });
});
