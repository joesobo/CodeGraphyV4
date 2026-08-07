import { execFileSync, spawnSync } from 'node:child_process';
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
  it('keeps Core and plugin diagnostics out of the JSON protocol', () => {
    const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'codegraphy-sidecar-console-'));
    temporaryDirectories.push(temporaryDirectory);
    const coreModulePath = path.join(temporaryDirectory, 'core.mjs');
    writeFileSync(coreModulePath, `
      console.debug('[plugin] debug');
      console.error('[plugin] error');
      console.info('[plugin] info');
      console.log('[plugin] initialized');
      console.warn('[plugin] warning');
      export const requestCodeGraphyWorkspaceGraph = input => {
        console.info('[core] opening %s', input.workspacePath);
        return {
          kind: 'ready',
          workspaceRoot: input.workspacePath,
          graphCache: '.codegraphy/graph.sqlite',
          cacheStatus: { state: 'fresh', staleReasons: [] },
          graph: { nodes: [], edges: [] },
        };
      };
      export const createCodeGraphyWorkspaceEngine = () => ({
        index: async () => ({ files: [], totalFound: 0, limitReached: false }),
        dispose: () => undefined,
      });
    `);
    const request = JSON.stringify({
      kind: 'request',
      id: 1,
      method: 'open',
      params: { workspaceRoot: temporaryDirectory },
    });

    const result = spawnSync(process.execPath, ['scripts/core-sidecar.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, CODEGRAPHY_DESKTOP_CORE_MODULE: coreModulePath },
      input: `${request}\n`,
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim().split('\n').map(line => JSON.parse(line) as unknown)).toEqual([
      expect.objectContaining({ kind: 'response', id: 1, outcome: 'success' }),
    ]);
    expect(result.stderr).toContain('[plugin] initialized');
    expect(result.stderr).toContain('[plugin] debug');
    expect(result.stderr).toContain('[plugin] error');
    expect(result.stderr).toContain('[plugin] info');
    expect(result.stderr).toContain('[plugin] warning');
    expect(result.stderr).toContain(`[core] opening ${temporaryDirectory}`);
  });

  it('keeps the first Indexing engine instead of indexing a cold workspace twice', () => {
    const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'codegraphy-sidecar-cold-'));
    temporaryDirectories.push(temporaryDirectory);
    const logPath = path.join(temporaryDirectory, 'engine.log');
    const coreModulePath = path.join(temporaryDirectory, 'core.mjs');
    writeFileSync(coreModulePath, `
      import { appendFileSync } from 'node:fs';
      const log = value => appendFileSync(${JSON.stringify(logPath)}, value + '\\n');
      let indexed = false;
      const result = workspaceRoot => ({
        workspaceRoot,
        files: [{ relativePath: 'README.md' }],
        totalFound: 1,
        limitReached: false,
        indexing: { mode: 'full', analyzedFiles: 1, deletedFiles: 0, reusedFiles: 0 },
      });
      export const requestCodeGraphyWorkspaceGraph = input => indexed
        ? {
            kind: 'ready',
            workspaceRoot: input.workspacePath,
            graphCache: '.codegraphy/graph.sqlite',
            cacheStatus: { state: 'fresh', staleReasons: [] },
            graph: { nodes: [], edges: [] },
          }
        : { kind: 'missing', workspaceRoot: input.workspacePath, graphCache: '.codegraphy/graph.sqlite' };
      export const createCodeGraphyWorkspaceEngine = options => ({
        index: async () => { indexed = true; log('engine:index'); return result(options.workspaceRoot); },
        applyChangedFiles: async paths => { log('apply:' + paths.join(',')); return result(options.workspaceRoot); },
        dispose: () => log('dispose'),
      });
      export const indexCodeGraphyWorkspace = async () => {
        log('one-shot:index');
        throw new Error('The sidecar must not create a second Indexing lifecycle.');
      };
    `);
    const input = [
      { kind: 'request', id: 1, method: 'open', params: { workspaceRoot: temporaryDirectory } },
      { kind: 'request', id: 2, method: 'update', params: { workspaceRoot: temporaryDirectory, relativePath: 'README.md' } },
    ].map(request => JSON.stringify(request)).join('\n');

    const output = execFileSync(process.execPath, ['scripts/core-sidecar.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, CODEGRAPHY_DESKTOP_CORE_MODULE: coreModulePath },
      input: `${input}\n`,
    });
    const responses = output.trim().split('\n')
      .map(line => JSON.parse(line) as { kind: string; id?: number })
      .filter(message => message.kind === 'response');

    expect(responses.map(response => response.id)).toEqual([1, 2]);
    expect(readFileSync(logPath, 'utf8')).toBe([
      'engine:index',
      'apply:README.md',
      'dispose',
      '',
    ].join('\n'));
  });

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
      export const requestCodeGraphyWorkspaceGraph = input => {
        log('projection:' + input.projection.nodeTypes.join(','));
        return graph(input.workspacePath);
      };
      export const indexCodeGraphyWorkspace = async input => result(input.workspaceRoot, 1, 0);
      export const createCodeGraphyWorkspaceEngine = options => ({
        index: async () => { log('index'); return result(options.workspaceRoot, 0, 1); },
        applyChangedFiles: async paths => { log('apply:' + paths.join(',')); return result(options.workspaceRoot, 1, 0); },
        dispose: () => log('dispose'),
      });
    `);
    const input = [
      { kind: 'request', id: 1, method: 'open', params: { workspaceRoot: temporaryDirectory } },
      { kind: 'request', id: 2, method: 'update', params: { workspaceRoot: temporaryDirectory, relativePath: 'src/index.ts' } },
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
    expect(readFileSync(logPath, 'utf8')).toBe([
      'projection:file,folder',
      'index',
      'apply:src/index.ts',
      'projection:file,folder',
      'dispose',
      '',
    ].join('\n'));
  });

  it('reads and writes only the desktop interface settings through Core', () => {
    const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'codegraphy-sidecar-settings-'));
    temporaryDirectories.push(temporaryDirectory);
    const logPath = path.join(temporaryDirectory, 'settings.json');
    const coreModulePath = path.join(temporaryDirectory, 'core.mjs');
    writeFileSync(coreModulePath, `
      import { writeFileSync } from 'node:fs';
      let settings = {
        version: 1,
        maxFiles: 321,
        interfaces: [
          { id: 'codegraphy.extension', data: { showLabels: false } },
          { id: 'codegraphy.desktop', data: { repelForce: 4 } },
          { id: 'example.peer', data: { enabled: true } },
        ],
      };
      export const readCodeGraphyWorkspaceSettingsOrInitial = () => settings;
      export const writeCodeGraphyWorkspaceSettings = (_root, next) => {
        settings = next;
        writeFileSync(${JSON.stringify(logPath)}, JSON.stringify(next));
      };
    `);
    const nextSettings = {
      repelForce: 10,
      linkDistance: 80,
      linkForce: 1,
      damping: 0.4,
      centerForce: 0.1,
    };
    const input = [
      { kind: 'request', id: 1, method: 'read-settings', params: { workspaceRoot: temporaryDirectory } },
      { kind: 'request', id: 2, method: 'write-settings', params: { workspaceRoot: temporaryDirectory, settings: nextSettings } },
      { kind: 'request', id: 3, method: 'read-settings', params: { workspaceRoot: temporaryDirectory } },
    ].map(request => JSON.stringify(request)).join('\n');

    const output = execFileSync(process.execPath, ['scripts/core-sidecar.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, CODEGRAPHY_DESKTOP_CORE_MODULE: coreModulePath },
      input: `${input}\n`,
    });
    const responses = output.trim().split('\n').map(line => JSON.parse(line) as {
      id: number;
      result: unknown;
    });
    const stored = JSON.parse(readFileSync(logPath, 'utf8')) as {
      interfaces: Array<{ id: string; data: unknown }>;
      maxFiles: number;
    };

    expect(responses.map(response => response.result)).toEqual([
      { repelForce: 4 },
      nextSettings,
      nextSettings,
    ]);
    expect(stored.maxFiles).toBe(321);
    expect(stored.interfaces).toEqual([
      { id: 'codegraphy.extension', data: { showLabels: false } },
      { id: 'example.peer', data: { enabled: true } },
      { id: 'codegraphy.desktop', data: nextSettings },
    ]);
  });
});
