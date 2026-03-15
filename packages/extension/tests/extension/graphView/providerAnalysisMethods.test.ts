import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderAnalysisMethods } from '../../../src/extension/graphView/providerAnalysisMethods';

describe('graphView/providerAnalysisMethods', () => {
  it('assigns the created methods back onto the provider source', () => {
    const source = {
      _analysisController: undefined,
      _analysisRequestId: 0,
      _analyzer: undefined,
      _analyzerInitialized: false,
      _analyzerInitPromise: undefined,
      _filterPatterns: [],
      _disabledRules: new Set<string>(),
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
    };
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
});
