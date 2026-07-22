import type { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type { TldrawApiClient } from './tldraw/api';
import {
  createCommandDependencies,
  openTldrawDocument,
  runCli,
  type CliDependencies,
  type CliPlatform,
} from './cli';

describe('runCli', () => {
  function dependencies() {
    return {
      runCommand: vi.fn<CliDependencies['runCommand']>(async () => ({
        documentPath: '/workspace/CodeGraphy.tldraw',
        workspaceRoot: '/workspace',
      })),
      writeError: vi.fn(),
      writeOutput: vi.fn(),
    } satisfies CliDependencies;
  }

  it('prints the compact launcher help without indexing', async () => {
    const cli = dependencies();

    await expect(runCli(['--help'], cli)).resolves.toBe(0);
    expect(cli.runCommand).not.toHaveBeenCalled();
    expect(cli.writeOutput).toHaveBeenCalledWith(expect.stringContaining(
      'codegraphy-tldraw [PATH]',
    ));
  });

  it('rejects extra arguments and non-tldraw paths', async () => {
    const cli = dependencies();

    await expect(runCli(['one.tldraw', 'two.tldraw'], cli)).resolves.toBe(1);
    await expect(runCli(['notes.txt'], cli)).resolves.toBe(1);

    expect(cli.runCommand).not.toHaveBeenCalled();
    expect(cli.writeError).toHaveBeenNthCalledWith(1, 'Usage: codegraphy-tldraw [PATH]');
    expect(cli.writeError).toHaveBeenNthCalledWith(2, 'PATH must end in .tldraw');
  });

  it('reports the opened document', async () => {
    const cli = dependencies();

    await expect(runCli(['graph.tldraw'], cli)).resolves.toBe(0);

    expect(cli.runCommand).toHaveBeenCalledWith(['graph.tldraw']);
    expect(cli.writeOutput).toHaveBeenCalledWith('Opened /workspace/CodeGraphy.tldraw\n');
  });

  it('reports command failures without a stack trace', async () => {
    const cli = dependencies();
    cli.runCommand
      .mockRejectedValueOnce(new Error('tldraw offline is unavailable'))
      .mockRejectedValueOnce('unknown failure');

    await expect(runCli([], cli)).resolves.toBe(1);
    await expect(runCli([], cli)).resolves.toBe(1);

    expect(cli.writeError).toHaveBeenNthCalledWith(1, 'tldraw offline is unavailable');
    expect(cli.writeError).toHaveBeenNthCalledWith(2, 'unknown failure');
  });
});

describe('CodeGraphy tldraw platform adapter', () => {
  function platformFixture() {
    const findOpenDocument = vi.fn(async () => ({ id: 'doc-1' }));
    const reconcileRecords = vi.fn(async () => undefined);
    const client = {
      findOpenDocument,
      getScriptWorkspace: vi.fn(async () => ({ scriptDir: '/tmp/tldraw-script' })),
      readShapes: vi.fn(async () => []),
      reconcileRecords,
    } as unknown as TldrawApiClient;
    const platform = {
      copyFile: vi.fn(async () => undefined),
      createClient: vi.fn(() => client),
      currentWorkingDirectory: () => '/workspace',
      homeDirectory: () => '/Users/example',
      indexWorkspace: vi.fn(async () => ({ graph: { nodes: [], edges: [] } })),
      openDocument: vi.fn(async () => undefined),
      readBytes: vi.fn(async (source: URL) => Buffer.from(source.pathname)),
      readText: vi.fn(async () => JSON.stringify({ port: 7236, token: 'secret' })),
      writeGraphDocument: vi.fn(async () => undefined),
    } satisfies CliPlatform;
    return { client, findOpenDocument, platform, reconcileRecords };
  }

  it('adapts indexing, live refresh, scripts, and saved document writes', async () => {
    const { platform, reconcileRecords } = platformFixture();
    const dependencies = createCommandDependencies(platform);

    await expect(dependencies.findOpenDocument('/workspace/graph.tldraw')).resolves.toEqual({
      id: 'doc-1',
    });
    await expect(dependencies.indexWorkspace('/workspace')).resolves.toEqual({
      graph: { nodes: [], edges: [] },
    });
    await dependencies.refreshOpenDocument({
      documentId: 'doc-1',
      graph: { nodes: [], edges: [] },
      workspaceRoot: '/workspace',
    });
    await dependencies.writeDocument({
      graph: { nodes: [], edges: [] },
      targetPath: '/workspace/graph.tldraw',
      workspaceRoot: '/workspace',
    });
    await dependencies.openDocument('/workspace/graph.tldraw');

    expect(platform.createClient).toHaveBeenCalledWith({ port: 7236, token: 'secret' });
    expect(reconcileRecords).toHaveBeenCalledWith('doc-1', []);
    expect(platform.copyFile).toHaveBeenCalledTimes(2);
    expect(platform.writeGraphDocument).toHaveBeenCalledWith(expect.objectContaining({
      targetPath: '/workspace/graph.tldraw',
    }));
    expect(platform.openDocument).toHaveBeenCalledWith('/workspace/graph.tldraw');
  });

  it('treats a missing server file as no live tldraw connection', async () => {
    const { platform } = platformFixture();
    platform.readText.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));

    await expect(createCommandDependencies(platform).findOpenDocument('/workspace/graph.tldraw'))
      .resolves.toBeUndefined();
  });

  it('treats a stale server connection as a closed tldraw app', async () => {
    const { findOpenDocument, platform } = platformFixture();
    findOpenDocument.mockRejectedValueOnce(new TypeError('fetch failed'));
    const dependencies = createCommandDependencies(platform);

    await expect(dependencies.findOpenDocument('/workspace/graph.tldraw'))
      .resolves.toBeUndefined();
    await expect(dependencies.refreshOpenDocument({
      documentId: 'doc-1',
      graph: { nodes: [], edges: [] },
      workspaceRoot: '/workspace',
    })).rejects.toThrow('tldraw offline is not available for live refresh');
  });

  it('rejects live refresh before a client is resolved', async () => {
    const { platform } = platformFixture();
    const dependencies = createCommandDependencies(platform);

    await expect(dependencies.refreshOpenDocument({
      documentId: 'doc-1',
      graph: { nodes: [], edges: [] },
      workspaceRoot: '/workspace',
    })).rejects.toThrow('tldraw offline is not available for live refresh');
  });

  it('opens tldraw offline and reports launcher failures', async () => {
    const successChild = new EventEmitter();
    const successSpawn = vi.fn(() => successChild) as unknown as typeof spawn;
    const success = openTldrawDocument('/workspace/graph.tldraw', successSpawn);
    successChild.emit('close', 0);
    await expect(success).resolves.toBeUndefined();

    const failedChild = new EventEmitter();
    const failedSpawn = vi.fn(() => failedChild) as unknown as typeof spawn;
    const failed = openTldrawDocument('/workspace/graph.tldraw', failedSpawn);
    failedChild.emit('close', 1);
    await expect(failed).rejects.toThrow('Unable to open tldraw offline (exit 1)');

    const errorChild = new EventEmitter();
    const errorSpawn = vi.fn(() => errorChild) as unknown as typeof spawn;
    const errored = openTldrawDocument('/workspace/graph.tldraw', errorSpawn);
    errorChild.emit('error', new Error('open is unavailable'));
    await expect(errored).rejects.toThrow('open is unavailable');
  });
});
