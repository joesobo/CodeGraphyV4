import { describe, expect, it, vi } from 'vitest';

import {
  runChangedFileRefresh,
  runIndexRefresh,
  runPrimaryRefresh,
  sendRefreshState,
} from '../../../../../src/extension/graphView/provider/refresh/run';

function createSource(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _sendAllSettings: vi.fn(),
    _sendGraphControls: vi.fn(),
    _sendMessage: vi.fn(),
    _sendFavorites: vi.fn(),
    _loadAndSendData: vi.fn(async () => undefined),
    _refreshAndSendData: vi.fn(async () => undefined),
    _analyzeAndSendData: vi.fn(async () => undefined),
    _incrementalAnalyzeAndSendData: vi.fn(async () => undefined),
    _rawGraphData: { nodes: [], edges: [] },
    _graphData: { nodes: [], edges: [] },
    _analyzer: {
      hasIndex: vi.fn(() => true),
      getIndexStatus: vi.fn(() => ({
        freshness: 'fresh',
        detail: 'CodeGraphy index is fresh.',
      })),
    },
    ...overrides,
  };
}

describe('graphView/provider/refresh/run', () => {
  it('sends refresh state even when graph controls are unavailable', () => {
    const source = createSource({ _sendGraphControls: undefined });

    expect(() => sendRefreshState(source as never)).not.toThrow();
    expect(source._sendAllSettings).toHaveBeenCalledOnce();
    expect(source._sendFavorites).not.toHaveBeenCalled();
  });

  it('republishes the current index status after a scoped refresh', () => {
    const source = createSource();

    sendRefreshState(source as never);

    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_INDEX_STATUS_UPDATED',
      payload: {
        hasIndex: true,
        freshness: 'fresh',
        detail: 'CodeGraphy index is fresh.',
      },
    });
  });

  it('falls back to full analysis when no primary load helper is available', async () => {
    const source = createSource({ _loadAndSendData: undefined });

    await runPrimaryRefresh(source as never);

    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('falls back to full analysis when no index refresh helper is available', async () => {
    const source = createSource({ _refreshAndSendData: undefined });

    await runIndexRefresh(source as never);

    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('uses the index refresh helper when it is available', async () => {
    const source = createSource();

    await runIndexRefresh(source as never);

    expect(source._refreshAndSendData).toHaveBeenCalledOnce();
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('falls back to the primary refresh when there is no indexed analyzer', async () => {
    const source = createSource({
      _analyzer: { hasIndex: vi.fn(() => false) },
      _loadAndSendData: vi.fn(async () => undefined),
    });

    const refreshMode = await runChangedFileRefresh(source as never, ['src/app.ts']);

    expect(refreshMode).toBe('primary');
    expect(source._loadAndSendData).toHaveBeenCalledOnce();
    expect(source._incrementalAnalyzeAndSendData).not.toHaveBeenCalled();
  });

  it('falls back to the primary refresh when the analyzer is unavailable', async () => {
    const source = createSource({
      _analyzer: undefined,
      _loadAndSendData: vi.fn(async () => undefined),
    });

    const refreshMode = await runChangedFileRefresh(source as never, ['src/app.ts']);

    expect(refreshMode).toBe('primary');
    expect(source._loadAndSendData).toHaveBeenCalledOnce();
    expect(source._incrementalAnalyzeAndSendData).not.toHaveBeenCalled();
  });

  it('uses incremental refresh when an indexed analyzer is available', async () => {
    const source = createSource();

    const refreshMode = await runChangedFileRefresh(source as never, ['src/app.ts']);

    expect(refreshMode).toBe('incremental');
    expect(source._incrementalAnalyzeAndSendData).toHaveBeenCalledWith(['src/app.ts']);
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
    expect(source._loadAndSendData).not.toHaveBeenCalled();
  });

  it('uses primary refresh for a loaded graph while index metadata is unavailable', async () => {
    const source = createSource({
      _analyzer: { hasIndex: vi.fn(() => false) },
      _rawGraphData: {
        nodes: [{ id: 'src/app.ts' }],
        edges: [],
      },
    });

    const refreshMode = await runChangedFileRefresh(source as never, ['src/app.ts']);

    expect(refreshMode).toBe('primary');
    expect(source._loadAndSendData).toHaveBeenCalledOnce();
    expect(source._incrementalAnalyzeAndSendData).not.toHaveBeenCalled();
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('uses primary refresh for an edge-only loaded graph while index metadata is unavailable', async () => {
    const source = createSource({
      _analyzer: { hasIndex: vi.fn(() => false) },
      _rawGraphData: {
        nodes: [],
        edges: [{ from: 'src/app.ts', to: 'src/dep.ts' }],
      },
    });

    const refreshMode = await runChangedFileRefresh(source as never, ['src/app.ts']);

    expect(refreshMode).toBe('primary');
    expect(source._loadAndSendData).toHaveBeenCalledOnce();
    expect(source._incrementalAnalyzeAndSendData).not.toHaveBeenCalled();
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('uses primary refresh when raw graph data has not loaded yet', async () => {
    const source = createSource({
      _analyzer: { hasIndex: vi.fn(() => false) },
      _rawGraphData: undefined,
      _graphData: {
        nodes: [{ id: 'src/app.ts' }],
        edges: [],
      },
    });

    const refreshMode = await runChangedFileRefresh(source as never, ['src/app.ts']);

    expect(refreshMode).toBe('primary');
    expect(source._loadAndSendData).toHaveBeenCalledOnce();
    expect(source._incrementalAnalyzeAndSendData).not.toHaveBeenCalled();
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('falls back to full analysis when incremental refresh is unavailable', async () => {
    const source = createSource({
      _incrementalAnalyzeAndSendData: undefined,
    });

    const refreshMode = await runChangedFileRefresh(source as never, ['src/app.ts']);

    expect(refreshMode).toBe('analysis');
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
  });
});
