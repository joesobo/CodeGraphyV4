export interface CodeGraphyPerformanceEvent {
  name: string;
  at: number;
  durationMs?: number;
  detail?: Record<string, unknown>;
}

export interface CodeGraphyPerformanceSink {
  enabled?: boolean;
  events?: CodeGraphyPerformanceEvent[];
  limit?: number;
}

declare global {
  interface Window {
    __codegraphyPerformance?: CodeGraphyPerformanceSink;
  }
}

const DEFAULT_EVENT_LIMIT = 500;

function getEnabledSink(): CodeGraphyPerformanceSink | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const sink = window.__codegraphyPerformance;
  return sink?.enabled ? sink : null;
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

export function recordWebviewPerformanceEvent(
  name: string,
  detail?: Record<string, unknown>,
  durationMs?: number,
): void {
  const sink = getEnabledSink();
  if (!sink) {
    return;
  }

  const events = Array.isArray(sink.events) ? sink.events : [];
  sink.events = events;
  events.push({
    name,
    at: roundMetric(window.performance.now()),
    ...(durationMs === undefined ? {} : { durationMs: roundMetric(durationMs) }),
    ...(detail ? { detail } : {}),
  });

  const configuredLimit = sink.limit;
  const limit = typeof configuredLimit === 'number'
    && Number.isInteger(configuredLimit)
    && configuredLimit > 0
    ? configuredLimit
    : DEFAULT_EVENT_LIMIT;
  if (events.length > limit) {
    events.splice(0, events.length - limit);
  }
}

export function measureWebviewPerformance<T>(
  name: string,
  detail: Record<string, unknown>,
  callback: () => T,
): T {
  const sink = getEnabledSink();
  if (!sink) {
    return callback();
  }

  const startedAt = window.performance.now();
  const result = callback();
  recordWebviewPerformanceEvent(name, detail, window.performance.now() - startedAt);
  return result;
}
