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

function createRuntime(): PerfScenarioRuntime {
  let extensionMessageHandler: ((message: unknown) => void) | undefined;
  return {
    emitMetric: vi.fn(),
    now: vi.fn(() => 25),
    onExtensionMessage: vi.fn((handler: (message: unknown) => void) => {
      extensionMessageHandler = handler;
      return { dispose: vi.fn() };
    }),
    onWebviewMessage: vi.fn((handler: (message: unknown) => void) => {
      handler({ type: 'PHYSICS_STABILIZED' });
      return { dispose: vi.fn() };
    }),
    openGraph: vi.fn(async () => {
      extensionMessageHandler?.({ type: 'APP_BOOTSTRAP_COMPLETE' });
    }),
  };
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

  it('rejects unknown scenario request fields', async () => {
    const runtime = createRuntime();

    await expect(runPerfScenario({
      runId: 'run-1',
      scenario: 'cold-open',
      startedAt: 5,
      unexpected: true,
    }, runtime)).rejects.toThrow();
    expect(runtime.openGraph).not.toHaveBeenCalled();
  });

  it('measures cold open through webview bootstrap', async () => {
    const runtime = createRuntime();

    await expect(runPerfScenario({
      runId: 'run-1',
      scenario: 'cold-open',
      startedAt: 5,
    }, runtime)).resolves.toEqual({
      runId: 'run-1',
      scenario: 'cold-open',
      metrics: [{ metric: 'coldOpenMs', unit: 'ms', value: 20 }],
    });
    expect(runtime.emitMetric).toHaveBeenCalledWith({
      runId: 'run-1',
      scenario: 'cold-open',
      metric: 'coldOpenMs',
      unit: 'ms',
      value: 20,
    });
    expect(runtime.onWebviewMessage).toHaveBeenCalledOnce();
  });
});
