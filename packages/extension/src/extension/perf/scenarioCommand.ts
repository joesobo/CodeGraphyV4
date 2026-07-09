import { performance } from 'node:perf_hooks';
import {
  emitPerfMetric,
  onPerfMetric,
  startPerfMetricSession,
  type PerfMetricContext,
  type PerfMetricDiagnosticEvent,
  type PerfMetricSessionContext,
} from '@codegraphy-dev/core';
import * as vscode from 'vscode';
import { z } from 'zod';
import type { GraphViewProvider } from '../graphViewProvider';

export const PERF_SCENARIO_COMMAND_ID = 'codegraphy.perf.runScenario';
const bootstrapTimeoutMs = 180_000;
const openScenarioSchema = z.enum(['cold-open', 'warm-open']);

const perfScenarioRequestSchema = z.strictObject({
  runId: z.string().min(1),
  scenario: openScenarioSchema,
  startedAt: z.number().finite().nonnegative(),
});

export type PerfScenarioRequest = z.infer<typeof perfScenarioRequestSchema>;

export interface PerfScenarioMetric {
  dimension?: string;
  metric: PerfMetricContext['metric'];
  operationId?: string;
  unit: PerfMetricContext['unit'];
  value: number;
}

export interface PerfScenarioResult {
  runId: string;
  scenario: z.infer<typeof openScenarioSchema>;
  metrics: PerfScenarioMetric[];
}

export interface PerfScenarioRuntime {
  emitMetric(input: PerfMetricContext): void;
  indexGraph(): Promise<void>;
  now(): number;
  onMetric(listener: (event: PerfMetricDiagnosticEvent) => void): vscode.Disposable;
  onExtensionMessage(handler: (message: unknown) => void): vscode.Disposable;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  openGraph(): Promise<void>;
  startMetricSession(context: PerfMetricSessionContext): vscode.Disposable;
}

interface PendingExtensionMessage {
  promise: Promise<void>;
  dispose(): void;
}

function waitForMessage(
  subscribe: (handler: (message: unknown) => void) => vscode.Disposable,
  expectedType: string,
  matches: (message: unknown) => boolean = () => true,
): PendingExtensionMessage {
  let subscription: vscode.Disposable | undefined;
  let timer: NodeJS.Timeout | undefined;

  const promise = new Promise<void>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${expectedType}`));
    }, bootstrapTimeoutMs);
    subscription = subscribe((message) => {
      if ((message as { type?: unknown }).type === expectedType && matches(message)) {
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

function isGraphCacheReady(message: unknown): boolean {
  return (message as { payload?: { hasIndex?: unknown } }).payload?.hasIndex === true;
}

async function indexColdGraph(runtime: PerfScenarioRuntime): Promise<void> {
  const graphUpdated = waitForMessage(
    handler => runtime.onExtensionMessage(handler),
    'GRAPH_DATA_UPDATED',
  );
  const stabilized = waitForMessage(
    handler => runtime.onWebviewMessage(handler),
    'PHYSICS_STABILIZED',
  );
  const graphCacheReady = waitForMessage(
    handler => runtime.onExtensionMessage(handler),
    'GRAPH_INDEX_STATUS_UPDATED',
    isGraphCacheReady,
  );

  try {
    // The current bridge messages do not carry operation IDs. Arming both
    // listeners after the bootstrap graph has settled avoids consuming that
    // settle, but a typed/correlated bridge is still needed to exclude an
    // unrelated concurrent graph update with certainty.
    await Promise.all([
      runtime.indexGraph(),
      graphUpdated.promise,
      graphCacheReady.promise,
      stabilized.promise,
    ]);
  } finally {
    graphUpdated.dispose();
    graphCacheReady.dispose();
    stabilized.dispose();
  }
}

export async function runPerfScenario(
  request: unknown,
  runtime: PerfScenarioRuntime,
): Promise<PerfScenarioResult> {
  const parsedRequest = perfScenarioRequestSchema.parse(request);
  const metrics: PerfScenarioMetric[] = [];
  const metricSubscription = runtime.onMetric((event) => {
    if (event.context.runId !== parsedRequest.runId) {
      return;
    }
    metrics.push({
      metric: event.context.metric,
      unit: event.context.unit,
      value: event.context.value,
      ...(event.context.dimension ? { dimension: event.context.dimension } : {}),
      ...(event.context.operationId ? { operationId: event.context.operationId } : {}),
    });
  });
  const metricSession = runtime.startMetricSession({
    runId: parsedRequest.runId,
    scenario: parsedRequest.scenario,
  });
  const bootstrap = waitForMessage(
    handler => runtime.onExtensionMessage(handler),
    'APP_BOOTSTRAP_COMPLETE',
  );
  const warmGraphUpdated = parsedRequest.scenario === 'warm-open'
    ? waitForMessage(
        handler => runtime.onExtensionMessage(handler),
        'GRAPH_DATA_UPDATED',
      )
    : undefined;
  const warmGraphCacheReady = parsedRequest.scenario === 'warm-open'
    ? waitForMessage(
        handler => runtime.onExtensionMessage(handler),
        'GRAPH_INDEX_STATUS_UPDATED',
        isGraphCacheReady,
      )
    : undefined;

  try {
    try {
      await runtime.openGraph();
      await Promise.all([
        bootstrap.promise,
        ...(warmGraphUpdated ? [warmGraphUpdated.promise] : []),
        ...(warmGraphCacheReady ? [warmGraphCacheReady.promise] : []),
      ]);
    } finally {
      bootstrap.dispose();
      warmGraphUpdated?.dispose();
      warmGraphCacheReady?.dispose();
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

    if (parsedRequest.scenario === 'cold-open') {
      await indexColdGraph(runtime);
    }

    runtime.emitMetric({
      runId: parsedRequest.runId,
      scenario: parsedRequest.scenario,
      metric: parsedRequest.scenario === 'cold-open' ? 'coldOpenMs' : 'warmOpenMs',
      unit: 'ms',
      value: Math.max(0, runtime.now() - parsedRequest.startedAt),
    });

    return {
      runId: parsedRequest.runId,
      scenario: parsedRequest.scenario,
      metrics,
    };
  } finally {
    metricSession.dispose();
    metricSubscription.dispose();
  }
}

export function registerPerfScenarioCommand(
  context: vscode.ExtensionContext,
  provider: Pick<
    GraphViewProvider,
    'dispatchWebviewMessage' | 'onExtensionMessage' | 'onWebviewMessage'
  >,
): void {
  if (process.env.CODEGRAPHY_PERF !== '1') {
    return;
  }

  const runtime: PerfScenarioRuntime = {
    emitMetric: input => { emitPerfMetric(input); },
    indexGraph: async () => {
      await provider.dispatchWebviewMessage({ type: 'INDEX_GRAPH' });
    },
    now: () => performance.now(),
    onMetric: listener => onPerfMetric(listener),
    onExtensionMessage: handler => provider.onExtensionMessage(handler),
    onWebviewMessage: handler => provider.onWebviewMessage(handler),
    openGraph: async () => {
      await vscode.commands.executeCommand('codegraphy.open');
    },
    startMetricSession: input => startPerfMetricSession(input),
  };
  context.subscriptions.push(
    vscode.commands.registerCommand(
      PERF_SCENARIO_COMMAND_ID,
      request => runPerfScenario(request, runtime),
    ),
  );
}
