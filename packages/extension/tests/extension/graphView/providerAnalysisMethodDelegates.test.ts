import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import { createGraphViewProviderAnalysisDelegates } from '../../../src/extension/graphView/providerAnalysisMethodDelegates';

describe('graphView/providerAnalysisMethodDelegates', () => {
  it('prefers source overrides for call-through helpers', () => {
    const graph = { nodes: [{ id: 'graph' }], edges: [] } satisfies IGraphData;
    const source = {
      _markWorkspaceReady: vi.fn(),
      _isAnalysisStale: vi.fn(() => true),
      _isAbortError: vi.fn(() => true),
    };
    const delegates = createGraphViewProviderAnalysisDelegates(source as never, {
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(() => false),
      isAbortError: vi.fn(() => false),
    });

    delegates.callMarkWorkspaceReady(graph);

    expect(delegates.callIsAnalysisStale(new AbortController().signal, 2)).toBe(true);
    expect(delegates.callIsAbortError(new Error('boom'))).toBe(true);
    expect(source._markWorkspaceReady).toHaveBeenCalledWith(graph);
    expect(source._isAnalysisStale).toHaveBeenCalledOnce();
    expect(source._isAbortError).toHaveBeenCalledOnce();
  });

  it('falls back to the provided delegate implementations', () => {
    const methods = {
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(() => true),
      isAbortError: vi.fn(() => true),
    };
    const delegates = createGraphViewProviderAnalysisDelegates({} as never, methods);

    delegates.callMarkWorkspaceReady({ nodes: [], edges: [] });

    expect(delegates.callIsAnalysisStale(new AbortController().signal, 2)).toBe(true);
    expect(delegates.callIsAbortError(new Error('boom'))).toBe(true);
    expect(methods.markWorkspaceReady).toHaveBeenCalledOnce();
    expect(methods.isAnalysisStale).toHaveBeenCalledOnce();
    expect(methods.isAbortError).toHaveBeenCalledOnce();
  });
});
