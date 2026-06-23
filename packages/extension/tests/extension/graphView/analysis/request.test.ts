import { beforeEach, describe, expect, it, vi } from 'vitest';

const performanceMocks = vi.hoisted(() => ({
  recordExtensionPerformanceEvent: vi.fn(),
}));

vi.mock('../../../../src/extension/performance/marks', () => ({
  recordExtensionPerformanceEvent: performanceMocks.recordExtensionPerformanceEvent,
}));

import {
  runGraphViewAnalysisRequest,
  type GraphViewAnalysisRequestState,
} from '../../../../src/extension/graphView/analysis/request';

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
  beforeEach(() => {
    performanceMocks.recordExtensionPerformanceEvent.mockReset();
  });

  it('records request lifecycle performance markers with mode context', async () => {
    const state = createState({
      mode: 'load',
      filterPatterns: ['src/**'],
      disabledPlugins: new Set(['plugin.test']),
    } as Partial<GraphViewAnalysisRequestState>);

    await runGraphViewAnalysisRequest(state, {
      executeAnalysis: vi.fn(() => Promise.resolve()),
      isAbortError: vi.fn(() => false),
      logError: vi.fn(),
      updateAnalysisController: vi.fn(),
      updateAnalysisRequestId: vi.fn(),
    });

    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.request.start',
      {
        requestId: 1,
        mode: 'load',
        filterPatternCount: 1,
        disabledPluginCount: 1,
      },
    );
    expect(performanceMocks.recordExtensionPerformanceEvent).toHaveBeenCalledWith(
      'graphAnalysis.request.completed',
      expect.objectContaining({
        requestId: 1,
        mode: 'load',
        filterPatternCount: 1,
        disabledPluginCount: 1,
        durationMs: expect.any(Number),
      }),
    );
  });

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

  it('does not log abort failures and still clears the active request', async () => {
    const state = createState();
    const error = new Error('cancelled');
    const logError = vi.fn();

    await runGraphViewAnalysisRequest(state, {
      executeAnalysis: vi.fn(() => Promise.reject(error)),
      isAbortError: vi.fn(() => true),
      logError,
      updateAnalysisController: vi.fn(),
      updateAnalysisRequestId: vi.fn(),
    });

    expect(logError).not.toHaveBeenCalled();
    expect(state.analysisController).toBeUndefined();
  });

  it('does not clear the active controller when a newer request replaced it', async () => {
    const state = createState();
    const replacementController = new AbortController();
    const updateAnalysisController = vi.fn((controller: AbortController | undefined) => {
      if (controller) {
        state.analysisController = replacementController;
      }
    });
    const updateAnalysisRequestId = vi.fn();

    await runGraphViewAnalysisRequest(state, {
      executeAnalysis: vi.fn(() => Promise.resolve()),
      isAbortError: vi.fn(() => false),
      logError: vi.fn(),
      updateAnalysisController,
      updateAnalysisRequestId,
    });

    expect(updateAnalysisController).toHaveBeenCalledWith(expect.any(AbortController));
    expect(updateAnalysisController).not.toHaveBeenCalledWith(undefined);
    expect(updateAnalysisRequestId).toHaveBeenCalledWith(1);
    expect(state.analysisController).toBe(replacementController);
  });
});
