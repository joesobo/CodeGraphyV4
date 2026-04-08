import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderAnalyzeAndSendData,
} from '../../../../../src/extension/graphView/provider/analysis/request';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from '../../../../../src/extension/graphView/provider/analysis/methods';

function createSource(
  overrides: Partial<GraphViewProviderAnalysisMethodsSource> = {},
): GraphViewProviderAnalysisMethodsSource {
  return {
    _analysisController: undefined,
    _analysisRequestId: 1,
    _analyzer: undefined,
    _analyzerInitialized: false,
    _analyzerInitPromise: undefined,
    _filterPatterns: [],
    _disabledSources: new Set<string>(),
    _disabledPlugins: new Set<string>(),
    _graphData: { nodes: [], edges: [] },
    _rawGraphData: { nodes: [], edges: [] },
    _firstAnalysis: true,
    _resolveFirstWorkspaceReady: undefined,
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

function createDependencies(
  overrides: Partial<GraphViewProviderAnalysisMethodDependencies> = {},
): GraphViewProviderAnalysisMethodDependencies {
  return {
    runAnalysisRequest: vi.fn(async () => undefined),
    executeAnalysis: vi.fn(async () => undefined),
    markWorkspaceReady: vi.fn(),
    isAnalysisStale: vi.fn(() => false),
    isAbortError: vi.fn(() => false),
    hasWorkspace: vi.fn(() => true),
    logError: vi.fn(),
    ...overrides,
  };
}

describe('graphView/provider/analysis/request', () => {
  it('runs the analysis request flow with delegate-backed abort checks and live request sync', async () => {
    const source = createSource();
    const doAnalyzeAndSendData = vi.fn(async () => {
      source._analyzerInitialized = true;
    });
    const dependencies = createDependencies({
      runAnalysisRequest: vi.fn(async (state, handlers) => {
        const controller = new AbortController();
        handlers.updateAnalysisController?.(controller);
        handlers.updateAnalysisRequestId?.(4);
        await handlers.executeAnalysis(controller.signal, 4);
        expect(handlers.isAbortError(new Error('boom'))).toBe(true);
      }),
    });
    const delegates = {
      callIsAbortError: vi.fn(() => true),
    };

    await createGraphViewProviderAnalyzeAndSendData(
      source,
      dependencies,
      delegates,
      doAnalyzeAndSendData,
    )();

    expect(doAnalyzeAndSendData).toHaveBeenCalledWith(expect.any(AbortSignal), 4);
    expect(source._analysisController).toBeInstanceOf(AbortController);
    expect(source._analysisRequestId).toBe(4);
    expect(source._analyzerInitialized).toBe(true);
    expect(delegates.callIsAbortError).toHaveBeenCalledOnce();
  });
});
