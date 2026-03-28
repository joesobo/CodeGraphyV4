import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/contracts';
import { createGraphViewProviderAnalysisDelegates } from '../../../../../src/extension/graphView/provider/analysis/delegates';
import { createGraphViewProviderAnalysisMethods } from '../../../../../src/extension/graphView/provider/analysis/index';

vi.mock('../../../../../src/extension/graphView/provider/analysis/delegates', async importOriginal => {
  const actual = await importOriginal<
    typeof import('../../../../../src/extension/graphView/provider/analysis/delegates')
  >();

  return {
    ...actual,
    createGraphViewProviderAnalysisDelegates: vi.fn(actual.createGraphViewProviderAnalysisDelegates),
  };
});

function createSource(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    _analysisController: undefined,
    _analysisRequestId: 7,
    _analyzer: {
      registry: {
        notifyWorkspaceReady: vi.fn(),
      },
    },
    _analyzerInitialized: false,
    _analyzerInitPromise: undefined,
    _filterPatterns: [],
    _disabledRules: new Set<string>(),
    _disabledPlugins: new Set<string>(),
    _graphData: { nodes: [], edges: [] },
    _rawGraphData: { nodes: [], edges: [] },
    _firstAnalysis: true,
    _resolveFirstWorkspaceReady: vi.fn(),
    _sendMessage: vi.fn(),
    _sendAvailableViews: vi.fn(),
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

describe('graphView/provider/analysis/index', () => {
  it('assigns the created methods back onto the provider source', () => {
    const source = createSource();
    const methods = createGraphViewProviderAnalysisMethods(source as never, {
      runAnalysisRequest: vi.fn(async () => undefined),
      executeAnalysis: vi.fn(async () => undefined),
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(() => false),
      isAbortError: vi.fn(() => false),
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    });

    expect(methods._analyzeAndSendData).toBe(source._analyzeAndSendData);
    expect(methods._doAnalyzeAndSendData).toBe(source._doAnalyzeAndSendData);
    expect(methods._markWorkspaceReady).toBe(source._markWorkspaceReady);
    expect(methods._isAnalysisStale).toBe(source._isAnalysisStale);
    expect(methods._isAbortError).toBe(source._isAbortError);
  });

  it('marks workspace readiness with the current registry and syncs the live state back to the source', () => {
    const source = createSource();
    const graphData = { nodes: [{ id: 'graph-node' }], edges: [] } satisfies IGraphData;
    const markWorkspaceReady = vi.fn((state, registry, graph) => {
      expect(state.firstAnalysis).toBe(true);
      expect(state.resolveFirstWorkspaceReady).toBe(source._resolveFirstWorkspaceReady);
      expect(registry).toBe(source._analyzer?.registry);
      expect(graph).toBe(graphData);
      state.firstAnalysis = false;
      state.resolveFirstWorkspaceReady = undefined;
    });
    const methods = createGraphViewProviderAnalysisMethods(source as never, {
      runAnalysisRequest: vi.fn(async () => undefined),
      executeAnalysis: vi.fn(async () => undefined),
      markWorkspaceReady,
      isAnalysisStale: vi.fn(() => false),
      isAbortError: vi.fn(() => false),
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    });

    methods._markWorkspaceReady(graphData);

    expect(markWorkspaceReady).toHaveBeenCalledOnce();
    expect(source._firstAnalysis).toBe(false);
    expect(source._resolveFirstWorkspaceReady).toBeUndefined();
  });

  it('passes live wrapper methods into the delegate factory', () => {
    const source = createSource({
      _analyzer: undefined,
    });
    const graphData = { nodes: [{ id: 'graph-node' }], edges: [] } satisfies IGraphData;
    const signal = new AbortController().signal;
    const error = new Error('aborted');
    const markWorkspaceReady = vi.fn((state, registry, graph) => {
      expect(registry).toBeUndefined();
      expect(graph).toBe(graphData);
      state.firstAnalysis = false;
      state.resolveFirstWorkspaceReady = undefined;
    });
    const isAnalysisStale = vi.fn((nextSignal, requestId, currentRequestId) =>
      nextSignal === signal && requestId === 5 && currentRequestId === 7,
    );
    const isAbortError = vi.fn(nextError => nextError === error);

    createGraphViewProviderAnalysisMethods(source as never, {
      runAnalysisRequest: vi.fn(async () => undefined),
      executeAnalysis: vi.fn(async () => undefined),
      markWorkspaceReady,
      isAnalysisStale,
      isAbortError,
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    });

    const wrappers = vi.mocked(createGraphViewProviderAnalysisDelegates).mock.calls.at(-1)?.[1] as {
      markWorkspaceReady(graph: IGraphData): void;
      isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
      isAbortError(error: unknown): boolean;
    };

    wrappers.markWorkspaceReady(graphData);

    expect(wrappers.isAnalysisStale(signal, 5)).toBe(true);
    expect(wrappers.isAbortError(error)).toBe(true);
    expect(markWorkspaceReady).toHaveBeenCalledOnce();
    expect(isAnalysisStale).toHaveBeenCalledWith(signal, 5, 7);
    expect(isAbortError).toHaveBeenCalledWith(error);
    expect(source._firstAnalysis).toBe(false);
    expect(source._resolveFirstWorkspaceReady).toBeUndefined();
  });

  it('checks analysis staleness against the current request id and delegates abort checks', () => {
    const signal = new AbortController().signal;
    const error = new Error('aborted');
    const isAnalysisStale = vi.fn((nextSignal, requestId, currentRequestId) =>
      nextSignal === signal && requestId === 3 && currentRequestId === 7,
    );
    const isAbortError = vi.fn(nextError => nextError === error);
    const methods = createGraphViewProviderAnalysisMethods(createSource() as never, {
      runAnalysisRequest: vi.fn(async () => undefined),
      executeAnalysis: vi.fn(async () => undefined),
      markWorkspaceReady: vi.fn(),
      isAnalysisStale,
      isAbortError,
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    });

    expect(methods._isAnalysisStale(signal, 3)).toBe(true);
    expect(methods._isAbortError(error)).toBe(true);
    expect(isAnalysisStale).toHaveBeenCalledWith(signal, 3, 7);
    expect(isAbortError).toHaveBeenCalledWith(error);
  });

  it('wires delegate callbacks through executeAnalysis and runAnalysisRequest', async () => {
    const source = createSource();
    const signal = new AbortController().signal;
    const graphData = { nodes: [{ id: 'graph-node' }], edges: [] } satisfies IGraphData;
    const error = new Error('aborted');
    const markWorkspaceReady = vi.fn((state, _registry, graph) => {
      expect(graph).toBe(graphData);
      state.firstAnalysis = false;
      state.resolveFirstWorkspaceReady = undefined;
    });
    const isAnalysisStale = vi.fn((nextSignal, requestId, currentRequestId) =>
      nextSignal === signal && requestId === 11 && currentRequestId === 7,
    );
    const isAbortError = vi.fn(nextError => nextError === error);
    const executeAnalysis = vi.fn(async (_signal, _requestId, _state, handlers) => {
      expect(handlers.isAnalysisStale(signal, 11)).toBe(true);
      handlers.markWorkspaceReady(graphData);
      expect(handlers.isAbortError(error)).toBe(true);
    });
    const runAnalysisRequest = vi.fn(async (_state, handlers) => {
      await handlers.executeAnalysis(signal, 11);
      expect(handlers.isAbortError(error)).toBe(true);
    });
    const methods = createGraphViewProviderAnalysisMethods(source as never, {
      runAnalysisRequest,
      executeAnalysis,
      markWorkspaceReady,
      isAnalysisStale,
      isAbortError,
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    });

    await methods._analyzeAndSendData();
    await methods._doAnalyzeAndSendData(signal, 11);

    expect(runAnalysisRequest).toHaveBeenCalledOnce();
    expect(executeAnalysis).toHaveBeenCalledTimes(2);
    expect(markWorkspaceReady).toHaveBeenCalledTimes(2);
    expect(isAnalysisStale).toHaveBeenCalledWith(signal, 11, 7);
    expect(isAbortError).toHaveBeenCalledWith(error);
    expect(source._firstAnalysis).toBe(false);
    expect(source._resolveFirstWorkspaceReady).toBeUndefined();
  });

  it('falls back to the delegate wrappers when source-owned analysis methods are unavailable', async () => {
    const source = createSource({
      _analyzer: undefined,
    });
    const signal = new AbortController().signal;
    const graphData = { nodes: [{ id: 'graph-node' }], edges: [] } satisfies IGraphData;
    const error = new Error('aborted');
    const markWorkspaceReady = vi.fn((state, registry, graph) => {
      expect(registry).toBeUndefined();
      expect(graph).toBe(graphData);
      state.firstAnalysis = false;
      state.resolveFirstWorkspaceReady = undefined;
    });
    const isAnalysisStale = vi.fn((nextSignal, requestId, currentRequestId) =>
      nextSignal === signal && requestId === 13 && currentRequestId === 7,
    );
    const isAbortError = vi.fn(nextError => nextError === error);
    const executeAnalysis = vi.fn(async (_signal, _requestId, _state, handlers) => {
      expect(handlers.isAnalysisStale(signal, 13)).toBe(true);
      handlers.markWorkspaceReady(graphData);
      expect(handlers.isAbortError(error)).toBe(true);
    });
    const methods = createGraphViewProviderAnalysisMethods(source as never, {
      runAnalysisRequest: vi.fn(async () => undefined),
      executeAnalysis,
      markWorkspaceReady,
      isAnalysisStale,
      isAbortError,
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    });

    source._markWorkspaceReady = undefined;
    source._isAnalysisStale = undefined;
    source._isAbortError = undefined;

    await methods._doAnalyzeAndSendData(signal, 13);

    expect(markWorkspaceReady).toHaveBeenCalledOnce();
    expect(isAnalysisStale).toHaveBeenCalledWith(signal, 13, 7);
    expect(isAbortError).toHaveBeenCalledWith(error);
    expect(source._firstAnalysis).toBe(false);
    expect(source._resolveFirstWorkspaceReady).toBeUndefined();
  });
});
