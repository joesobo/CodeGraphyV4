import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import * as vscode from 'vscode';

const perfHarness = vi.hoisted(() => ({
  runNonOpenPerfScenario: vi.fn<(...args: unknown[]) => Promise<unknown>>(
    async () => undefined,
  ),
  runIdleWatchScenario: vi.fn(async (input: unknown) => {
    const request = input as {
      dimension: string;
      onIdleStarted?: (event: unknown) => Promise<void> | void;
      runId: string;
    };
    await request.onIdleStarted?.({
      dimension: request.dimension,
      durationMs: 60_000,
      kind: 'idle-started',
      operationId: `${request.runId}:idle-watch:${request.dimension}:0`,
      runId: request.runId,
      scenario: 'idle-watch',
    });
    return undefined;
  }),
  runInteractionBurstScenario: vi.fn(async () => undefined),
}));

vi.mock('../../../src/extension/perf/scenarios/run', () => ({
  runNonOpenPerfScenario: perfHarness.runNonOpenPerfScenario,
}));

vi.mock('../../../src/extension/perf/scenarios/webviewControl', () => ({
  runIdleWatchScenario: perfHarness.runIdleWatchScenario,
  runInteractionBurstScenario: perfHarness.runInteractionBurstScenario,
}));

import {
  PERF_SCENARIO_COMMAND_ID,
  registerPerfScenarioCommand,
  runPerfScenario,
  type PerfScenarioRuntime,
} from '../../../src/extension/perf/scenarioCommand';

function createContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

function createProvider() {
  return {
    onExtensionMessage: vi.fn(() => ({ dispose: vi.fn() })),
  };
}

function createScenarioProvider() {
  const extensionMessageHandlers = new Set<(message: unknown) => void>();
  const webviewMessageHandlers = new Set<(message: unknown) => void>();
  const provider = {
    dispatchWebviewMessage: vi.fn(async (message: unknown) => {
      if ((message as { type?: unknown }).type === 'INDEX_GRAPH') {
        for (const handler of extensionMessageHandlers) {
          handler({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
          handler({
            type: 'GRAPH_INDEX_STATUS_UPDATED',
            payload: { hasIndex: true, freshness: 'fresh', detail: 'Graph Cache is fresh' },
          });
        }
      }
    }),
    emitExtensionMessage(message: unknown): void {
      for (const handler of extensionMessageHandlers) {
        handler(message);
      }
    },
    onExtensionMessage: vi.fn((handler: (message: unknown) => void) => {
      extensionMessageHandlers.add(handler);
      return { dispose: () => { extensionMessageHandlers.delete(handler); } };
    }),
    onWebviewMessage: vi.fn((handler: (message: unknown) => void) => {
      webviewMessageHandlers.add(handler);
      return { dispose: () => { webviewMessageHandlers.delete(handler); } };
    }),
    openInEditor: vi.fn(),
    sendToWebview: vi.fn((message: unknown) => {
      const request = message as {
        type?: unknown;
        payload?: { graphRevision?: unknown; requestId?: unknown };
      };
      if (
        request.type !== 'PERF_RENDER_READY_REQUEST'
        || typeof request.payload?.requestId !== 'string'
      ) {
        return;
      }
      for (const handler of webviewMessageHandlers) {
        handler({
          type: 'PERF_RENDER_READY',
          payload: {
            graphRevision: request.payload.graphRevision,
            requestId: request.payload.requestId,
            nodeCount: 0,
            edgeCount: 0,
          },
        });
      }
    }),
  };
  return provider;
}

describe('performance scenario command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CODEGRAPHY_PERF;
  });

  afterEach(() => {
    delete process.env.CODEGRAPHY_PERF;
    (vscode.workspace as unknown as { workspaceFolders: unknown }).workspaceFolders = undefined;
  });

  it('stays unregistered outside performance runs', () => {
    registerPerfScenarioCommand(createContext(), createProvider() as never);

    expect(vscode.commands.registerCommand).not.toHaveBeenCalled();
  });

  it('registers a hidden command for performance runs', () => {
    process.env.CODEGRAPHY_PERF = '1';
    const context = createContext();
    const disposable = { dispose: vi.fn() };
    vi.mocked(vscode.commands.registerCommand).mockReturnValue(disposable);

    registerPerfScenarioCommand(context, createProvider() as never);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      PERF_SCENARIO_COMMAND_ID,
      expect.any(Function),
    );
    expect(context.subscriptions).toContain(disposable);
  });

  it('routes cold indexing through the production webview message path', async () => {
    process.env.CODEGRAPHY_PERF = '1';
    const provider = createScenarioProvider();
    provider.openInEditor.mockImplementation(() => {
      provider.emitExtensionMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: { nodes: [], edges: [] },
      });
      provider.emitExtensionMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    registerPerfScenarioCommand(createContext(), provider as never);
    const command = vi.mocked(vscode.commands.registerCommand).mock.calls[0]?.[1] as
      | ((request: unknown) => Promise<unknown>)
      | undefined;

    await expect(command?.({
      runId: 'run-production-path',
      scenario: 'cold-open',
      dimension: 'small',
      startedAt: 0,
    })).resolves.toBeDefined();
    expect(provider.openInEditor).toHaveBeenCalledWith(vscode.ViewColumn.Two);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    expect(provider.dispatchWebviewMessage).toHaveBeenCalledWith({ type: 'INDEX_GRAPH' });
    expect(provider.sendToWebview).toHaveBeenCalledWith({
      type: 'PERF_RENDER_READY_REQUEST',
      payload: { graphRevision: 0, requestId: expect.any(String) },
    });
  });

  it('routes a scripted request through the production scenario runner', async () => {
    process.env.CODEGRAPHY_PERF = '1';
    const provider = createScenarioProvider();
    const workspaceFolderUri = vscode.Uri.file('/workspace');
    (vscode.workspace as unknown as { workspaceFolders: unknown }).workspaceFolders = [{
      uri: workspaceFolderUri,
    }];
    provider.openInEditor.mockImplementation(() => {
      provider.emitExtensionMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
      provider.emitExtensionMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
      provider.emitExtensionMessage({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: { hasIndex: true },
      });
    });
    perfHarness.runNonOpenPerfScenario.mockResolvedValueOnce({
      comparison: {
        codeGraphyRevealMs: 7,
        explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
      },
    });

    registerPerfScenarioCommand(createContext(), provider as never);
    const command = vi.mocked(vscode.commands.registerCommand).mock.calls[0]?.[1] as
      | ((request: unknown) => Promise<unknown>)
      | undefined;

    await expect(command?.({
      runId: 'run-rename',
      scenario: 'rename',
      dimension: 'small',
      startedAt: 0,
    })).resolves.toEqual(expect.objectContaining({
      comparison: {
        codeGraphyRevealMs: 7,
        explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
      },
    }));
    expect(perfHarness.runNonOpenPerfScenario).toHaveBeenCalledWith({
      dimension: 'small',
      provider,
      runId: 'run-rename',
      scenario: 'rename',
      workspaceFolderUri,
    }, expect.any(Function), {
      runIdleWatchScenario: expect.any(Function),
      runInteractionBurstScenario: expect.any(Function),
      runScopeToggleScenario: expect.any(Function),
    });
  });

  it('writes the idle marker only from the correlated idle-started event', async () => {
    process.env.CODEGRAPHY_PERF = '1';
    const resultRoot = await mkdtemp(join(tmpdir(), 'codegraphy-idle-marker-'));
    onTestFinished(() => rm(resultRoot, { recursive: true, force: true }));
    const markerPath = join(resultRoot, 'idle.ready');
    const provider = createScenarioProvider();
    const workspaceFolderUri = vscode.Uri.file('/workspace');
    (vscode.workspace as unknown as { workspaceFolders: unknown }).workspaceFolders = [{
      uri: workspaceFolderUri,
    }];
    provider.openInEditor.mockImplementation(() => {
      provider.emitExtensionMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
      provider.emitExtensionMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
      provider.emitExtensionMessage({
        type: 'GRAPH_INDEX_STATUS_UPDATED',
        payload: { hasIndex: true },
      });
    });
    perfHarness.runNonOpenPerfScenario.mockImplementationOnce(async (...args: unknown[]) => {
      const dependencies = args[2] as {
        runIdleWatchScenario(input: {
          dimension: string;
          ordinal: number;
          runId: string;
        }): Promise<unknown>;
      };
      return dependencies.runIdleWatchScenario({
        dimension: 'small',
        ordinal: 0,
        runId: 'run-idle-marker',
      });
    });

    registerPerfScenarioCommand(createContext(), provider as never);
    const command = vi.mocked(vscode.commands.registerCommand).mock.calls[0]?.[1] as
      | ((request: unknown) => Promise<unknown>)
      | undefined;

    await command?.({
      dimension: 'small',
      idleCpuReadyPath: markerPath,
      runId: 'run-idle-marker',
      scenario: 'idle-watch',
      startedAt: 0,
    });

    await expect(readFile(markerPath, 'utf8')).resolves.toBe('run-idle-marker\n');
    expect(perfHarness.runIdleWatchScenario).toHaveBeenCalledWith(
      expect.objectContaining({ onIdleStarted: expect.any(Function) }),
      expect.anything(),
    );
  });

  it('rejects unknown scenario request fields', async () => {
    const openGraph = vi.fn();
    const runtime = { openGraph } as unknown as PerfScenarioRuntime;

    await expect(runPerfScenario({
      runId: 'run-1',
      scenario: 'cold-open',
      dimension: 'small',
      startedAt: 5,
      unexpected: true,
    }, runtime)).rejects.toThrow();
    expect(openGraph).not.toHaveBeenCalled();
  });
});
