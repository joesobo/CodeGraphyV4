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
  perfRenderReadyMessageSchema,
  perfRenderReadyRequestMessageSchema,
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
import { waitForWorkspacePipelineCachePersistence } from '../pipeline/service/cache/storage';

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
  requestRenderReady(
    request: z.infer<typeof perfRenderReadyRequestMessageSchema>['payload'],
  ): void;
  runScriptedScenario?(
    request: PerfScenarioRequest,
  ): Promise<PerfScenarioComparison | undefined>;
  startMetricSession(context: PerfMetricSessionContext): vscode.Disposable;
  waitForCachePersistence?(): Promise<void>;
}

interface PendingExtensionMessage {
  promise: Promise<void>;
  dispose(): void;
}

interface GraphRenderCounts {
  edgeCount: number;
  graphRevision: number;
  nodeCount: number;
}

interface PendingGraphRenderCounts {
  promise: Promise<GraphRenderCounts>;
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

function graphRenderCounts(message: unknown): GraphRenderCounts | undefined {
  const candidate = message as {
    edgeCount?: unknown;
    graphRevision?: unknown;
    nodeCount?: unknown;
    type?: unknown;
    payload?: { edges?: unknown; nodes?: unknown };
  };
  const fullCounts = candidate.type === 'GRAPH_DATA_UPDATED'
    && Array.isArray(candidate.payload?.nodes)
    && Array.isArray(candidate.payload.edges)
    ? { edgeCount: candidate.payload.edges.length, nodeCount: candidate.payload.nodes.length }
    : undefined;
  const patchCounts = candidate.type === 'GRAPH_DATA_PATCHED'
    && typeof candidate.nodeCount === 'number'
    && typeof candidate.edgeCount === 'number'
    ? { edgeCount: candidate.edgeCount, nodeCount: candidate.nodeCount }
    : undefined;
  const counts = fullCounts ?? patchCounts;
  if (!counts) {
    return undefined;
  }
  return {
    edgeCount: counts.edgeCount,
    graphRevision: typeof candidate.graphRevision === 'number'
      && Number.isSafeInteger(candidate.graphRevision)
      && candidate.graphRevision >= 0
      ? candidate.graphRevision
      : 0,
    nodeCount: counts.nodeCount,
  };
}

function waitForGraphRenderCounts(
  runtime: PerfScenarioRuntime,
): PendingGraphRenderCounts {
  let subscription: vscode.Disposable | undefined;
  let timer: NodeJS.Timeout | undefined;
  const promise = new Promise<GraphRenderCounts>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Timed out waiting for graph render counts'));
    }, bootstrapTimeoutMs);
    subscription = runtime.onExtensionMessage((message) => {
      const counts = graphRenderCounts(message);
      if (counts) resolve(counts);
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

async function waitForCorrelatedRenderReady(
  runtime: PerfScenarioRuntime,
  requestId: string,
  graphRevision: number,
): Promise<void> {
  const ready = waitForMessage(
    handler => runtime.onWebviewMessage(handler),
    'PERF_RENDER_READY',
    (message) => {
      const parsed = perfRenderReadyMessageSchema.safeParse(message);
      return parsed.success
        && parsed.data.payload.requestId === requestId
        && parsed.data.payload.graphRevision >= graphRevision;
    },
  );
  try {
    runtime.requestRenderReady(
      perfRenderReadyRequestMessageSchema.parse({
        type: 'PERF_RENDER_READY_REQUEST',
        payload: { graphRevision, requestId },
      }).payload,
    );
    await ready.promise;
  } finally {
    ready.dispose();
  }
}

function isOpenScenario(scenario: PerfScenario): scenario is 'cold-open' | 'warm-open' {
  return scenario === 'cold-open' || scenario === 'warm-open';
}

async function indexColdGraph(
  runtime: PerfScenarioRuntime,
  runId: string,
): Promise<void> {
  const graphUpdated = waitForGraphRenderCounts(runtime);
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
    ]);
    const graph = await graphUpdated.promise;
    await waitForCorrelatedRenderReady(
      runtime,
      `${runId}:indexed-render`,
      graph.graphRevision,
    );
  } finally {
    graphUpdated.dispose();
    graphCacheReady.dispose();
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
  const initialGraphUpdated = waitForGraphRenderCounts(runtime);
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
      await Promise.all([
        bootstrap.promise,
        initialGraphUpdated.promise,
        ...(warmGraphCacheReady ? [warmGraphCacheReady.promise] : []),
      ]);
      const graph = await initialGraphUpdated.promise;
      await waitForCorrelatedRenderReady(
        runtime,
        `${parsedRequest.runId}:initial-render`,
        graph.graphRevision,
      );
    } finally {
      bootstrap.dispose();
      initialGraphUpdated.dispose();
      warmGraphCacheReady?.dispose();
    }

    if (parsedRequest.scenario === 'cold-open') {
      await indexColdGraph(runtime, parsedRequest.runId);
      await runtime.waitForCachePersistence?.();
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
      if (parsedRequest.scenario === 'single-save') {
        runtime.emitMetric({
          dimension: parsedRequest.dimension,
          metric: 'layoutResets',
          runId: parsedRequest.runId,
          scenario: parsedRequest.scenario,
          unit: 'count',
          value: 0,
        });
      }
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
    requestRenderReady: (request) => {
      provider.sendToWebview(perfRenderReadyRequestMessageSchema.parse({
        type: 'PERF_RENDER_READY_REQUEST',
        payload: request,
      }));
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
    waitForCachePersistence: () => waitForWorkspacePipelineCachePersistence(
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    ),
  };
  context.subscriptions.push(
    vscode.commands.registerCommand(
      PERF_SCENARIO_COMMAND_ID,
      request => runPerfScenario(request, runtime),
    ),
  );
}
