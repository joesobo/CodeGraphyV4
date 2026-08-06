import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('Core desktop sidecar', () => {
  it('keeps a workspace engine and applies a saved File as an incremental change', () => {
    const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'codegraphy-sidecar-test-'));
    temporaryDirectories.push(temporaryDirectory);
    const logPath = path.join(temporaryDirectory, 'engine.log');
    const coreModulePath = path.join(temporaryDirectory, 'core.mjs');
    writeFileSync(coreModulePath, `
      import { appendFileSync } from 'node:fs';
      const log = value => appendFileSync(${JSON.stringify(logPath)}, value + '\\n');
      const graph = workspaceRoot => ({
        kind: 'ready',
        workspaceRoot,
        graphCache: '.codegraphy/graph.sqlite',
        cacheStatus: { state: 'fresh', staleReasons: [] },
        graph: { nodes: [], edges: [] },
      });
      const result = (workspaceRoot, analyzedFiles, reusedFiles) => ({
        workspaceRoot,
        graphCachePath: workspaceRoot + '/.codegraphy/graph.sqlite',
        files: [{ relativePath: 'src/index.ts' }],
        totalFound: 1,
        limitReached: false,
        indexing: { mode: 'incremental', analyzedFiles, deletedFiles: 0, reusedFiles },
      });
      export const requestCodeGraphyWorkspaceGraph = input => graph(input.workspacePath);
      export const indexCodeGraphyWorkspace = async input => result(input.workspaceRoot, 1, 0);
      export const createCodeGraphyWorkspaceEngine = options => ({
        index: async () => { log('index'); return result(options.workspaceRoot, 0, 1); },
        applyChangedFiles: async paths => { log('apply:' + paths.join(',')); return result(options.workspaceRoot, 1, 0); },
        dispose: () => log('dispose'),
      });
    `);
    const input = [
      { kind: 'request', id: 1, method: 'open', params: { workspaceRoot: temporaryDirectory, includeSymbols: false } },
      { kind: 'request', id: 2, method: 'update', params: { workspaceRoot: temporaryDirectory, relativePath: 'src/index.ts', includeSymbols: false } },
    ].map(request => JSON.stringify(request)).join('\n');

    const output = execFileSync(process.execPath, ['scripts/core-sidecar.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, CODEGRAPHY_DESKTOP_CORE_MODULE: coreModulePath },
      input: `${input}\n`,
    });
    const messages = output.trim().split('\n').map(line => JSON.parse(line) as Record<string, unknown>);
    const responses = messages.filter(message => message.kind === 'response');

    expect(responses).toHaveLength(2);
    expect(responses[1]).toMatchObject({
      id: 2,
      outcome: 'success',
      result: { indexing: { mode: 'incremental', analyzedFiles: 1 } },
    });
    expect(readFileSync(logPath, 'utf8')).toBe('index\napply:src/index.ts\ndispose\n');
  });
});
