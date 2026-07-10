import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
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
import {
  perfScenarioSchema,
  type PerfScenario,
} from '../../shared/perf/protocol';
import {
  createPerfMetricAggregation,
} from './aggregation';
import { createPerfScenarioOperationRunner } from './scenarioOperation';
import {
  runNonOpenPerfScenario,
  type NonOpenPerfScenario,
} from './scenarios/run';
import {
  runIdleWatchScenario,
  runInteractionBurstScenario,
} from './scenarios/webviewControl';
import { runScopeToggleScenario } from './scope/battery';
import {
  parsePerfScenarioComparison,
  type PerfScenarioComparison,
} from './explorer/comparison';
import {
  perfScenarioResultSchema,
  type PerfScenarioResult,
} from './result';

export const PERF_SCENARIO_COMMAND_ID = 'codegraphy.perf.runScenario';
const bootstrapTimeoutMs = 180_000;

const perfScenarioRequestSchema = z.strictObject({
  runId: z.string().min(1),
  scenario: perfScenarioSchema,
  dimension: z.string().trim().min(1),
  idleCpuReadyPath: z.string().trim().min(1).optional(),
  startedAt: z.number().finite().nonnegative(),
});

export type PerfScenarioRequest = z.infer<typeof perfScenarioRequestSchema>;

export interface PerfScenarioRuntime {
  emitMetric(input: PerfMetricContext): void;
  indexGraph(): Promise<void>;
  now(): number;
  onMetric(listener: (event: PerfMetricDiagnosticEvent) => void): vscode.Disposable;
  onExtensionMessage(handler: (message: unknown) => void): vscode.Disposable;
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  openGraph(): Promise<void>;
  runScriptedScenario?(
    request: PerfScenarioRequest,
  ): Promise<PerfScenarioComparison | undefined>;
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

function isOpenScenario(scenario: PerfScenario): scenario is 'cold-open' | 'warm-open' {
  return scenario === 'cold-open' || scenario === 'warm-open';
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
  let comparison: PerfScenarioComparison | undefined;
  const metricAggregation = createPerfMetricAggregation({ runId: parsedRequest.runId });
  const metricSubscription = runtime.onMetric(event => metricAggregation.collect(event));
  const metricSession = runtime.startMetricSession({
    runId: parsedRequest.runId,
    scenario: parsedRequest.scenario,
    dimension: parsedRequest.dimension,
  });
  const bootstrap = waitForMessage(
    handler => runtime.onExtensionMessage(handler),
    'APP_BOOTSTRAP_COMPLETE',
  );
  const warmGraphUpdated = parsedRequest.scenario !== 'cold-open'
    ? waitForMessage(
        handler => runtime.onExtensionMessage(handler),
        'GRAPH_DATA_UPDATED',
      )
    : undefined;
  const warmGraphCacheReady = parsedRequest.scenario !== 'cold-open'
    ? waitForMessage(
        handler => runtime.onExtensionMessage(handler),
        'GRAPH_INDEX_STATUS_UPDATED',
        isGraphCacheReady,
      )
    : undefined;

  try {
    try {
      await runtime.openGraph();
      const stabilized = waitForMessage(
        handler => runtime.onWebviewMessage(handler),
        'PHYSICS_STABILIZED',
      );
      try {
        await Promise.all([
          bootstrap.promise,
          ...(warmGraphUpdated ? [warmGraphUpdated.promise] : []),
          ...(warmGraphCacheReady ? [warmGraphCacheReady.promise] : []),
          stabilized.promise,
        ]);
      } finally {
        stabilized.dispose();
      }
    } finally {
      bootstrap.dispose();
      warmGraphUpdated?.dispose();
      warmGraphCacheReady?.dispose();
    }

    if (parsedRequest.scenario === 'cold-open') {
      await indexColdGraph(runtime);
    }

    if (isOpenScenario(parsedRequest.scenario)) {
      runtime.emitMetric({
        runId: parsedRequest.runId,
        scenario: parsedRequest.scenario,
        metric: parsedRequest.scenario === 'cold-open' ? 'coldOpenMs' : 'warmOpenMs',
        unit: 'ms',
        value: Math.max(0, runtime.now() - parsedRequest.startedAt),
      });
    } else if (runtime.runScriptedScenario) {
      const scriptedComparison = await runtime.runScriptedScenario(parsedRequest);
      if (scriptedComparison !== undefined) {
        comparison = parsePerfScenarioComparison(
          parsedRequest.scenario,
          scriptedComparison,
        );
      }
    } else {
      throw new Error(`Performance scenario ${parsedRequest.scenario} is not registered`);
    }

    return perfScenarioResultSchema.parse({
      ...(comparison ? { comparison } : {}),
      runId: parsedRequest.runId,
      scenario: parsedRequest.scenario,
      metrics: metricAggregation.metrics(),
    });
  } finally {
    metricSession.dispose();
    metricSubscription.dispose();
  }
}

export function registerPerfScenarioCommand(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider,
): void {
  if (process.env.CODEGRAPHY_PERF !== '1') {
    return;
  }

  const operationRuntime = {
    emitMetric: input => { emitPerfMetric(input); },
    now: () => performance.now(),
    onMessage: (handler: (message: unknown) => void) => provider.onWebviewMessage(handler),
    sendControl: message => { provider.sendToWebview(message); },
    startMetricSession: input => startPerfMetricSession(input),
  } satisfies Parameters<typeof createPerfScenarioOperationRunner>[0];
  const runOperation = createPerfScenarioOperationRunner(operationRuntime);
  const runtime: PerfScenarioRuntime = {
    emitMetric: operationRuntime.emitMetric,
    indexGraph: async () => {
      await provider.dispatchWebviewMessage({ type: 'INDEX_GRAPH' });
    },
    now: operationRuntime.now,
    onMetric: listener => onPerfMetric(listener),
    onExtensionMessage: handler => provider.onExtensionMessage(handler),
    onWebviewMessage: handler => provider.onWebviewMessage(handler),
    openGraph: async () => {
      provider.openInEditor(vscode.ViewColumn.Two);
    },
    runScriptedScenario: async (request) => {
      if (isOpenScenario(request.scenario)) {
        throw new Error(`Open scenario cannot use scripted runner: ${request.scenario}`);
      }
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error(`Performance scenario ${request.scenario} requires a workspace folder`);
      }
      const scriptedResult = await runNonOpenPerfScenario({
        dimension: request.dimension,
        provider,
        runId: request.runId,
        scenario: request.scenario as NonOpenPerfScenario,
        workspaceFolderUri: workspaceFolder.uri,
      }, runOperation, {
        runIdleWatchScenario: input => runIdleWatchScenario({
          ...input,
          ...(request.idleCpuReadyPath
            ? {
                onIdleStarted: () => writeFile(
                  request.idleCpuReadyPath!,
                  `${request.runId}\n`,
                  'utf8',
                ),
              }
            : {}),
        }, operationRuntime),
        runInteractionBurstScenario: input =>
          runInteractionBurstScenario(input, operationRuntime),
        runScopeToggleScenario: input => runScopeToggleScenario(input, operationRuntime),
      });
      if (
        request.scenario !== 'rename'
        && request.scenario !== 'create'
        && request.scenario !== 'delete'
      ) {
        return undefined;
      }
      return parsePerfScenarioComparison(
        request.scenario,
        (scriptedResult as { comparison?: unknown }).comparison,
      );
    },
    startMetricSession: input => operationRuntime.startMetricSession(input),
  };
  context.subscriptions.push(
    vscode.commands.registerCommand(
      PERF_SCENARIO_COMMAND_ID,
      request => runPerfScenario(request, runtime),
    ),
  );
}
