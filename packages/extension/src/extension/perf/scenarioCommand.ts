import { performance } from 'node:perf_hooks';
import { emitPerfMetric } from '@codegraphy-dev/core';
import * as vscode from 'vscode';
import { z } from 'zod';
import type { GraphViewProvider } from '../graphViewProvider';

export const PERF_SCENARIO_COMMAND_ID = 'codegraphy.perf.runScenario';
const bootstrapTimeoutMs = 180_000;

const perfScenarioRequestSchema = z.strictObject({
  runId: z.string().min(1),
  scenario: z.literal('cold-open'),
  startedAt: z.number().finite().nonnegative(),
});

export type PerfScenarioRequest = z.infer<typeof perfScenarioRequestSchema>;

interface PerfScenarioMetric {
  metric: 'coldOpenMs';
  unit: 'ms';
  value: number;
}

export interface PerfScenarioResult {
  runId: string;
  scenario: 'cold-open';
  metrics: PerfScenarioMetric[];
}

export interface PerfScenarioRuntime {
  emitMetric(input: {
    runId: string;
    scenario: 'cold-open';
    metric: 'coldOpenMs';
    unit: 'ms';
    value: number;
  }): void;
  now(): number;
  onExtensionMessage(handler: (message: unknown) => void): vscode.Disposable;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  openGraph(): Promise<void>;
}

interface PendingExtensionMessage {
  promise: Promise<void>;
  dispose(): void;
}

function waitForMessage(
  subscribe: (handler: (message: unknown) => void) => vscode.Disposable,
  expectedType: string,
): PendingExtensionMessage {
  let subscription: vscode.Disposable | undefined;
  let timer: NodeJS.Timeout | undefined;

  const promise = new Promise<void>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${expectedType}`));
    }, bootstrapTimeoutMs);
    subscription = subscribe((message) => {
      if ((message as { type?: unknown }).type === expectedType) {
        resolve();
      }
    });
  });

  return {
    promise,
    dispose(): void {
      if (timer) clearTimeout(timer);
      subscription?.dispose();
    },
  };
}

export async function runPerfScenario(
  request: unknown,
  runtime: PerfScenarioRuntime,
): Promise<PerfScenarioResult> {
  const parsedRequest = perfScenarioRequestSchema.parse(request);
  const bootstrap = waitForMessage(
    handler => runtime.onExtensionMessage(handler),
    'APP_BOOTSTRAP_COMPLETE',
  );

  try {
    await runtime.openGraph();
    await bootstrap.promise;
  } finally {
    bootstrap.dispose();
  }

  const stabilized = waitForMessage(
    handler => runtime.onWebviewMessage(handler),
    'PHYSICS_STABILIZED',
  );
  try {
    await stabilized.promise;
  } finally {
    stabilized.dispose();
  }

  const metric: PerfScenarioMetric = {
    metric: 'coldOpenMs',
    unit: 'ms',
    value: Math.max(0, runtime.now() - parsedRequest.startedAt),
  };
  runtime.emitMetric({
    runId: parsedRequest.runId,
    scenario: parsedRequest.scenario,
    ...metric,
  });

  return {
    runId: parsedRequest.runId,
    scenario: parsedRequest.scenario,
    metrics: [metric],
  };
}

export function registerPerfScenarioCommand(
  context: vscode.ExtensionContext,
  provider: Pick<GraphViewProvider, 'onExtensionMessage' | 'onWebviewMessage'>,
): void {
  if (process.env.CODEGRAPHY_PERF !== '1') {
    return;
  }

  const runtime: PerfScenarioRuntime = {
    emitMetric: input => { emitPerfMetric(input); },
    now: () => performance.now(),
    onExtensionMessage: handler => provider.onExtensionMessage(handler),
    onWebviewMessage: handler => provider.onWebviewMessage(handler),
    openGraph: async () => {
      await vscode.commands.executeCommand('codegraphy.open');
    },
  };
  context.subscriptions.push(
    vscode.commands.registerCommand(
      PERF_SCENARIO_COMMAND_ID,
      request => runPerfScenario(request, runtime),
    ),
  );
}
