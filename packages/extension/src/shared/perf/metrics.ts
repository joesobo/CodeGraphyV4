import { z } from 'zod';

export const perfMetricNameSchema = z.enum([
  'coldOpenMs',
  'warmOpenMs',
  'incrementalRefreshMs',
  'payloadBytes',
  'watcherToGraphMs',
  'fileOpRoundtripMs',
  'layoutResets',
  'cacheSaveMs',
  'cacheBytes',
  'treeSitterParseMs',
  'graphBuildMs',
  'pluginActivationMs',
  'scopeToggleMs',
  'settleTimeMs',
  'idleCpuPct',
  'simTicksAfterSettle',
  'fpsIdle',
  'fpsDrag',
  'fpsSettle',
  'longTasksPerInteraction',
  'heapUsedBytes',
]);

export const perfMetricUnitSchema = z.enum([
  'ms',
  'bytes',
  'count',
  'fps',
  'percent',
]);

export type PerfMetricName = z.infer<typeof perfMetricNameSchema>;
export type PerfMetricUnit = z.infer<typeof perfMetricUnitSchema>;
