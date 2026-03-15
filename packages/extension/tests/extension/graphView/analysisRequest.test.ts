import { describe, expect, it, vi } from 'vitest';
import {
  runGraphViewAnalysisRequest,
  type GraphViewAnalysisRequestState,
} from '../../../src/extension/graphView/analysisRequest';

function createState(
  overrides: Partial<GraphViewAnalysisRequestState> = {},
): GraphViewAnalysisRequestState {
  return {
    analysisController: undefined,
    analysisRequestId: 0,
    ...overrides,
  };
}

describe('graph view analysis request', () => {
  it('aborts the previous controller and clears the active request on success', async () => {
    const previousController = new AbortController();
    const abortSpy = vi.spyOn(previousController, 'abort');
    const state = createState({ analysisController: previousController });
    const executeAnalysis = vi.fn(() => Promise.resolve());

    await runGraphViewAnalysisRequest(state, {
      executeAnalysis,
      isAbortError: vi.fn(() => false),
      logError: vi.fn(),
      updateAnalysisController: vi.fn(),
      updateAnalysisRequestId: vi.fn(),
    });

    expect(abortSpy).toHaveBeenCalledOnce();
    expect(executeAnalysis).toHaveBeenCalledWith(expect.any(AbortSignal), 1);
    expect(state.analysisRequestId).toBe(1);
    expect(state.analysisController).toBeUndefined();
  });

  it('logs unexpected failures and still clears the active request', async () => {
    const state = createState();
    const error = new Error('boom');
    const logError = vi.fn();

    await runGraphViewAnalysisRequest(state, {
      executeAnalysis: vi.fn(() => Promise.reject(error)),
      isAbortError: vi.fn(() => false),
      logError,
      updateAnalysisController: vi.fn(),
      updateAnalysisRequestId: vi.fn(),
    });

    expect(logError).toHaveBeenCalledWith('[CodeGraphy] Analysis failed:', error);
    expect(state.analysisController).toBeUndefined();
  });
});
