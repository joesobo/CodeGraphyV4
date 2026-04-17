import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { createGraphViewProviderAnalysisDelegates } from '../../../../../src/extension/graphView/provider/analysis/delegates';

describe('graphView/provider/analysis/delegates', () => {
  it('calls the source workspace-ready callback when it exists', () => {
    const graph = {
      nodes: [{ id: 'graph', label: 'graph', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    const source = {
      _markWorkspaceReady: vi.fn(),
    };
    const delegates = createGraphViewProviderAnalysisDelegates(source as never, {
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(),
      isAbortError: vi.fn(),
    });

    delegates.callMarkWorkspaceReady(graph);

    expect(source._markWorkspaceReady).toHaveBeenCalledWith(graph);
  });

  it('falls back to the provided workspace-ready callback when the source callback is missing', () => {
    const methods = {
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(),
      isAbortError: vi.fn(),
    };
    const delegates = createGraphViewProviderAnalysisDelegates({} as never, methods);

    delegates.callMarkWorkspaceReady({ nodes: [], edges: [] });

    expect(methods.markWorkspaceReady).toHaveBeenCalledOnce();
  });

  it('uses the source stale-analysis callback when it exists', () => {
    const signal = new AbortController().signal;
    const source = {
      _isAnalysisStale: vi.fn(() => true),
    };
    const delegates = createGraphViewProviderAnalysisDelegates(source as never, {
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(() => false),
      isAbortError: vi.fn(),
    });

    expect(delegates.callIsAnalysisStale(signal, 2)).toBe(true);
    expect(source._isAnalysisStale).toHaveBeenCalledWith(signal, 2);
  });

  it('falls back to the provided stale-analysis callback when the source callback is missing', () => {
    const methods = {
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(() => true),
      isAbortError: vi.fn(),
    };
    const delegates = createGraphViewProviderAnalysisDelegates({} as never, methods);

    expect(delegates.callIsAnalysisStale(new AbortController().signal, 2)).toBe(true);
    expect(methods.isAnalysisStale).toHaveBeenCalledOnce();
  });

  it('uses the source abort-error callback when it exists', () => {
    const error = new Error('boom');
    const source = {
      _isAbortError: vi.fn(() => true),
    };
    const delegates = createGraphViewProviderAnalysisDelegates(source as never, {
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(),
      isAbortError: vi.fn(() => false),
    });

    expect(delegates.callIsAbortError(error)).toBe(true);
    expect(source._isAbortError).toHaveBeenCalledWith(error);
  });

  it('falls back to the provided abort-error callback when the source callback is missing', () => {
    const methods = {
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(),
      isAbortError: vi.fn(() => true),
    };
    const delegates = createGraphViewProviderAnalysisDelegates({} as never, methods);

    expect(delegates.callIsAbortError(new Error('boom'))).toBe(true);
    expect(methods.isAbortError).toHaveBeenCalledOnce();
  });
});
