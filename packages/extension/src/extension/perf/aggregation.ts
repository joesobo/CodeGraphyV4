import type {
  PerfMetricContext,
  PerfMetricDiagnosticEvent,
  PerfMetricName,
} from '@codegraphy-dev/core';

const metricRank = {
  coldOpenMs: 0,
  warmOpenMs: 1,
  incrementalRefreshMs: 2,
  payloadBytes: 3,
  watcherToGraphMs: 4,
  fileOpRoundtripMs: 5,
  layoutResets: 6,
  cacheSaveMs: 7,
  cacheBytes: 8,
  treeSitterParseMs: 9,
  graphBuildMs: 10,
  pluginActivationMs: 11,
  scopeToggleMs: 12,
  settleTimeMs: 13,
  idleCpuPct: 14,
  simTicksAfterSettle: 15,
  fpsIdle: 16,
  fpsDrag: 17,
  fpsSettle: 18,
  longTasksPerInteraction: 19,
  heapUsedBytes: 20,
} satisfies Readonly<Record<PerfMetricName, number>>;

export interface PerfScenarioMetric {
  dimension?: string;
  metric: PerfMetricContext['metric'];
  operationId?: string;
  unit: PerfMetricContext['unit'];
  value: number;
}

export interface PerfMetricAggregationScope {
  operationId?: string;
  runId: string;
  treeSitterTargetFilePath?: string;
}

export interface PerfMetricAggregation {
  collect(event: PerfMetricDiagnosticEvent): void;
  metrics(): PerfScenarioMetric[];
}

function compareText(left: string | undefined, right: string | undefined): number {
  return (left ?? '').localeCompare(right ?? '');
}

function compareMetrics(left: PerfScenarioMetric, right: PerfScenarioMetric): number {
  return metricRank[left.metric] - metricRank[right.metric]
    || compareText(left.dimension, right.dimension)
    || compareText(left.operationId, right.operationId)
    || compareText(left.unit, right.unit)
    || left.value - right.value;
}

export function createPerfMetricAggregation(
  scope: PerfMetricAggregationScope,
): PerfMetricAggregation {
  const distinctMetrics: PerfScenarioMetric[] = [];
  const parseTotalsByOperation = new Map<
    string | undefined,
    Map<string | undefined, number>
  >();
  const targetParseTotalsByOperation = new Map<
    string | undefined,
    Map<string, number>
  >();

  return {
    collect(event): void {
      const { context } = event;
      if (context.runId !== scope.runId) return;
      if (scope.operationId !== undefined && context.operationId !== scope.operationId) return;
      if (context.metric !== 'treeSitterParseMs') {
        distinctMetrics.push({
          metric: context.metric,
          unit: context.unit,
          value: context.value,
          ...(context.dimension ? { dimension: context.dimension } : {}),
          ...(context.operationId ? { operationId: context.operationId } : {}),
        });
        return;
      }

      const operationTotals = parseTotalsByOperation.get(context.operationId)
        ?? new Map<string | undefined, number>();
      operationTotals.set(
        context.dimension,
        (operationTotals.get(context.dimension) ?? 0) + context.value,
      );
      parseTotalsByOperation.set(context.operationId, operationTotals);
      if (
        scope.treeSitterTargetFilePath
        && context.filePath === scope.treeSitterTargetFilePath
        && context.dimension
      ) {
        const targetTotals = targetParseTotalsByOperation.get(context.operationId)
          ?? new Map<string, number>();
        targetTotals.set(
          context.dimension,
          (targetTotals.get(context.dimension) ?? 0) + context.value,
        );
        targetParseTotalsByOperation.set(context.operationId, targetTotals);
      }
    },
    metrics(): PerfScenarioMetric[] {
      const parseMetrics: PerfScenarioMetric[] = [...parseTotalsByOperation.entries()]
        .flatMap(([operationId, dimensionTotals]) =>
          [...dimensionTotals.entries()].map(([dimension, value]) => ({
            metric: 'treeSitterParseMs',
            unit: 'ms',
            value,
            ...(dimension ? { dimension } : {}),
            ...(operationId ? { operationId } : {}),
          })));
      const targetParseMetrics: PerfScenarioMetric[] = [...targetParseTotalsByOperation.entries()]
        .flatMap(([operationId, dimensionTotals]) =>
          [...dimensionTotals.entries()].map(([dimension, value]) => ({
            metric: 'treeSitterParseMs' as const,
            unit: 'ms' as const,
            value,
            dimension: `${dimension}:${scope.treeSitterTargetFilePath}`,
            ...(operationId ? { operationId } : {}),
          })));
      // Async emitters can arrive in different orders. Sort by canonical
      // metric order, then dimension, operation, unit, and value so JSON is stable.
      return [...distinctMetrics, ...parseMetrics, ...targetParseMetrics].sort(compareMetrics);
    },
  };
}
