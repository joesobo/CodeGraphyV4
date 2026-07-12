import { describe, expect, it } from 'vitest';
import type {
  GraphNode,
  GraphNodeMetricsUpdate,
} from '../../../../../src/webview/store/messageHandlers/graphDataMessage/contracts';
import {
  applyMetricUpdates,
  applyMetricUpdatesInPlace,
  nodeSizeModeUsesNodeMetrics,
} from '../../../../../src/webview/store/messageHandlers/graphDataMessage/metricUpdates';

describe('webview/store/messageHandlers/graphDataMessage/metricUpdates', () => {
  it('uses live metric patches only for file-size node sizing', () => {
    expect(nodeSizeModeUsesNodeMetrics('file-size')).toBe(true);
    expect(nodeSizeModeUsesNodeMetrics('churn')).toBe(false);
    expect(nodeSizeModeUsesNodeMetrics('connections')).toBe(false);
    expect(nodeSizeModeUsesNodeMetrics('uniform')).toBe(false);
  });

  it('applies changed metric updates in place', () => {
    const appNode = createNode('src/app.ts', { fileSize: 100, churn: 1 });
    const libNode = createNode('src/lib.ts', { fileSize: 50, churn: 3 });
    const graphData = { nodes: [appNode, libNode] };

    const changed = applyMetricUpdatesInPlace(graphData, createUpdates([
      { id: 'src/app.ts', fileSize: 120, churn: 99 },
      { id: 'src/lib.ts', fileSize: 50, churn: 99 },
    ]));

    expect(changed).toBe(true);
    expect(graphData.nodes[0]).toBe(appNode);
    expect(graphData.nodes[0]).toMatchObject({ fileSize: 120, churn: 1 });
    expect(graphData.nodes[1]).toBe(libNode);
    expect(graphData.nodes[1]).toMatchObject({ fileSize: 50, churn: 3 });
  });

  it('does not change nodes in place when updates are missing or metrics already match', () => {
    const appNode = createNode('src/app.ts', { fileSize: 100, churn: 1 });
    const graphData = { nodes: [appNode] };

    const changed = applyMetricUpdatesInPlace(graphData, createUpdates([
      { id: 'src/app.ts', fileSize: 100, churn: 99 },
      { id: 'src/missing.ts', fileSize: 999, churn: 99 },
    ]));

    expect(changed).toBe(false);
    expect(graphData.nodes).toEqual([appNode]);
  });

  it('returns new node objects only for changed immutable metric updates', () => {
    const appNode = createNode('src/app.ts', { fileSize: 100, churn: 1 });
    const libNode = createNode('src/lib.ts', { fileSize: 50, churn: 3 });

    const result = applyMetricUpdates([appNode, libNode], createUpdates([
      { id: 'src/app.ts', fileSize: 120, churn: 99 },
    ]));

    expect(result.changed).toBe(true);
    expect(result.nodes[0]).not.toBe(appNode);
    expect(result.nodes[0]).toMatchObject({ fileSize: 120, churn: 1 });
    expect(result.nodes[1]).toBe(libNode);
    expect(appNode).toMatchObject({ fileSize: 100, churn: 1 });
  });

  it('preserves immutable node objects when metric updates do not change values', () => {
    const appNode = createNode('src/app.ts', { fileSize: 100, churn: 1 });

    const result = applyMetricUpdates([appNode], createUpdates([
      { id: 'src/app.ts', fileSize: 100, churn: 99 },
      { id: 'src/missing.ts', fileSize: 999, churn: 99 },
    ]));

    expect(result.changed).toBe(false);
    expect(result.nodes).toEqual([appNode]);
    expect(result.nodes[0]).toBe(appNode);
  });
});

function createNode(
  id: string,
  metrics: Pick<GraphNode, 'fileSize' | 'churn'>,
): GraphNode {
  return {
    id,
    label: id,
    color: '#94a3b8',
    ...metrics,
  };
}

function createUpdates(
  updates: GraphNodeMetricsUpdate[],
): ReadonlyMap<string, GraphNodeMetricsUpdate> {
  return new Map(updates.map((update) => [update.id, update]));
}
