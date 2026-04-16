import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { GraphViewProviderAnalysisMethodsSource } from '../../../../../src/extension/graphView/provider/analysis/methods';
import { createGraphViewProviderAnalysisMethods } from '../../../../../src/extension/graphView/provider/analysis/methods';
import { createGraphViewProviderDoAnalyzeAndSendData } from '../../../../../src/extension/graphView/provider/analysis/execution';
import { createGraphViewProviderAnalyzeAndSendData } from '../../../../../src/extension/graphView/provider/analysis/request';

vi.mock('../../../../../src/extension/graphView/provider/analysis/execution', () => ({
  createGraphViewProviderDoAnalyzeAndSendData: vi.fn(),
}));

vi.mock('../../../../../src/extension/graphView/provider/analysis/request', () => ({
  createGraphViewProviderAnalyzeAndSendData: vi.fn(),
}));

function createSource(
  overrides: Partial<GraphViewProviderAnalysisMethodsSource> = {},
): GraphViewProviderAnalysisMethodsSource {
  return {
    _analysisController: undefined,
    _analysisRequestId: 1,
    _changedFilePaths: undefined,
    _analyzer: undefined,
    _analyzerInitialized: false,
    _analyzerInitPromise: undefined,
    _installedPluginActivationPromise: undefined,
    _filterPatterns: [],
    _disabledPlugins: new Set<string>(),
    _graphData: { nodes: [], edges: [] },
    _rawGraphData: { nodes: [], edges: [] },
    _firstAnalysis: true,
    _resolveFirstWorkspaceReady: undefined,
    _sendMessage: vi.fn(),
    _sendDepthState: vi.fn(),
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _updateViewContext: vi.fn(),
    _applyViewTransform: vi.fn(),
    _sendPluginStatuses: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendContextMenuItems: vi.fn(),
    ...overrides,
  };
}

describe('graphView/provider/analysis/methods factories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the expected request and execution handlers for each analysis mode', async () => {
    const doRunners = {
      load: vi.fn(async () => undefined),
      analyze: vi.fn(async () => undefined),
      index: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      incremental: vi.fn(async () => undefined),
    };
    const requestRunners = {
      load: vi.fn(async () => undefined),
      analyze: vi.fn(async () => undefined),
      index: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      incremental: vi.fn(async () => undefined),
    };

    vi.mocked(createGraphViewProviderDoAnalyzeAndSendData).mockImplementation(
      (_source, _dependencies, _delegates, mode) => doRunners[mode],
    );
    vi.mocked(createGraphViewProviderAnalyzeAndSendData).mockImplementation(
      (_source, _dependencies, _delegates, doAnalyzeAndSendData, mode) => {
        expect(doAnalyzeAndSendData).toBe(doRunners[mode]);
        return requestRunners[mode];
      },
    );

    const source = createSource();
    const methods = createGraphViewProviderAnalysisMethods(source);

    await methods._loadAndSendData();
    await methods._analyzeAndSendData();
    await methods._indexAndSendData();
    await methods._refreshAndSendData();
    await methods._incrementalAnalyzeAndSendData(['src/app.ts', 'src/lib.ts']);

    expect(source._changedFilePaths).toEqual(['src/app.ts', 'src/lib.ts']);
    expect(vi.mocked(createGraphViewProviderDoAnalyzeAndSendData).mock.calls.map(call => call[3])).toEqual([
      'load',
      'analyze',
      'index',
      'refresh',
      'incremental',
    ]);
    expect(vi.mocked(createGraphViewProviderAnalyzeAndSendData).mock.calls.map(call => call[4])).toEqual([
      'load',
      'analyze',
      'index',
      'refresh',
      'incremental',
    ]);
    expect(requestRunners.load).toHaveBeenCalledOnce();
    expect(requestRunners.analyze).toHaveBeenCalledOnce();
    expect(requestRunners.index).toHaveBeenCalledOnce();
    expect(requestRunners.refresh).toHaveBeenCalledOnce();
    expect(requestRunners.incremental).toHaveBeenCalledOnce();
  });
});
