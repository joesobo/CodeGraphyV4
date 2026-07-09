import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
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
      handler({ type: 'PHYSICS_STABILIZED' });
      return { dispose: vi.fn() };
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
    vi.mocked(vscode.commands.executeCommand).mockImplementation(async () => {
      provider.emitExtensionMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
    });

    registerPerfScenarioCommand(createContext(), provider as never);
    const command = vi.mocked(vscode.commands.registerCommand).mock.calls[0]?.[1] as
      | ((request: unknown) => Promise<unknown>)
      | undefined;

    await expect(command?.({
      runId: 'run-production-path',
      scenario: 'cold-open',
      startedAt: 0,
    })).resolves.toBeDefined();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('codegraphy.open');
    expect(provider.dispatchWebviewMessage).toHaveBeenCalledWith({ type: 'INDEX_GRAPH' });
  });

  it('rejects unknown scenario request fields', async () => {
    const openGraph = vi.fn();
    const runtime = { openGraph } as unknown as PerfScenarioRuntime;

    await expect(runPerfScenario({
      runId: 'run-1',
      scenario: 'cold-open',
      startedAt: 5,
      unexpected: true,
    }, runtime)).rejects.toThrow();
    expect(openGraph).not.toHaveBeenCalled();
  });
});
