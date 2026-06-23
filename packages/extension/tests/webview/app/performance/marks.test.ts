import { afterEach, describe, expect, it } from 'vitest';
import {
  measureWebviewPerformance,
  recordWebviewPerformanceEvent,
} from '../../../../src/webview/performance/marks';

describe('webview/performance/marks', () => {
  afterEach(() => {
    window.__codegraphyPerformance = undefined;
  });

  it('does not record events until the sink is enabled', () => {
    window.__codegraphyPerformance = { enabled: false, events: [] };

    recordWebviewPerformanceEvent('visibleGraph.derive');

    expect(window.__codegraphyPerformance.events).toEqual([]);
  });

  it('records enabled events and bounds the event list', () => {
    window.__codegraphyPerformance = { enabled: true, events: [], limit: 1 };

    recordWebviewPerformanceEvent('first', { count: 1 });
    recordWebviewPerformanceEvent('second', { count: 2 }, 12.345);

    expect(window.__codegraphyPerformance.events).toEqual([
      expect.objectContaining({
        detail: { count: 2 },
        durationMs: 12.35,
        name: 'second',
      }),
    ]);
  });

  it('measures a callback while preserving the returned value', () => {
    window.__codegraphyPerformance = { enabled: true, events: [] };

    const result = measureWebviewPerformance('graphRuntime.buildGraphData', { nodeCount: 2 }, () => 'done');

    expect(result).toBe('done');
    expect(window.__codegraphyPerformance.events).toEqual([
      expect.objectContaining({
        detail: { nodeCount: 2 },
        name: 'graphRuntime.buildGraphData',
      }),
    ]);
    expect(window.__codegraphyPerformance.events?.[0]?.durationMs).toEqual(expect.any(Number));
  });
});
