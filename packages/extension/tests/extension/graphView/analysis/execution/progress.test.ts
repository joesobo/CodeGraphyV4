import { describe, expect, it } from 'vitest';
import {
  createGraphViewAnalysisProgressForwarder,
  sendInitialGraphViewAnalysisProgress,
} from '../../../../../src/extension/graphView/analysis/execution/progress';
import { createExecutionHandlers } from './fixtures';

describe('graph view analysis execution progress', () => {
  it('preserves analyzer progress phase labels', () => {
    const { handlers } = createExecutionHandlers();
    const forwardProgress = createGraphViewAnalysisProgressForwarder('refresh', handlers);

    forwardProgress({
      phase: 'Saving Graph Cache',
      current: 2,
      total: 5,
    });

    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Saving Graph Cache',
      current: 2,
      total: 5,
    });
  });

  it('coalesces dense progress updates while preserving the first and final states', () => {
    const { handlers } = createExecutionHandlers();
    const forwardProgress = createGraphViewAnalysisProgressForwarder('refresh', handlers);

    for (let current = 1; current <= 100; current += 1) {
      forwardProgress({
        phase: 'Refreshing Index',
        current,
        total: 100,
      });
    }

    expect(handlers.sendIndexProgress).toHaveBeenCalledTimes(21);
    expect(handlers.sendIndexProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Refreshing Index',
      current: 1,
      total: 100,
    });
    expect(handlers.sendIndexProgress).not.toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 2,
      total: 100,
    });
    expect(handlers.sendIndexProgress).toHaveBeenLastCalledWith({
      phase: 'Refreshing Index',
      current: 100,
      total: 100,
    });
  });

  it('keeps every progress update for small totals', () => {
    const { handlers } = createExecutionHandlers();
    const forwardProgress = createGraphViewAnalysisProgressForwarder('refresh', handlers);

    for (let current = 1; current <= 5; current += 1) {
      forwardProgress({
        phase: 'Refreshing Index',
        current,
        total: 5,
      });
    }

    expect(handlers.sendIndexProgress).toHaveBeenCalledTimes(5);
  });

  it('keeps phase changes even when dense progress stays in the same bucket', () => {
    const { handlers } = createExecutionHandlers();
    const forwardProgress = createGraphViewAnalysisProgressForwarder('refresh', handlers);

    forwardProgress({ phase: 'Refreshing Index', current: 1, total: 100 });
    forwardProgress({ phase: 'Saving Graph Cache', current: 2, total: 100 });

    expect(handlers.sendIndexProgress).toHaveBeenCalledTimes(2);
    expect(handlers.sendIndexProgress).toHaveBeenLastCalledWith({
      phase: 'Saving Graph Cache',
      current: 2,
      total: 100,
    });
  });

  it('falls back to the mode label when a progress update does not name its phase', () => {
    const { handlers } = createExecutionHandlers();

    createGraphViewAnalysisProgressForwarder('refresh', handlers)({
      phase: '',
      current: 2,
      total: 5,
    });

    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 2,
      total: 5,
    });
  });

  it('publishes the initial progress state for indexed modes only', () => {
    const indexed = createExecutionHandlers();
    const loaded = createExecutionHandlers();
    const refreshed = createExecutionHandlers();
    const incremental = createExecutionHandlers();
    const analyzed = createExecutionHandlers();

    sendInitialGraphViewAnalysisProgress('index', indexed.handlers);
    sendInitialGraphViewAnalysisProgress('load', loaded.handlers);
    sendInitialGraphViewAnalysisProgress('refresh', refreshed.handlers);
    sendInitialGraphViewAnalysisProgress('incremental', incremental.handlers);
    sendInitialGraphViewAnalysisProgress('analyze', analyzed.handlers);

    expect(indexed.handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Indexing Workspace',
      current: 0,
      total: 1,
    });
    expect(refreshed.handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 0,
      total: 1,
    });
    expect(incremental.handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Applying Changes',
      current: 0,
      total: 1,
    });
    expect(loaded.handlers.sendIndexProgress).not.toHaveBeenCalled();
    expect(analyzed.handlers.sendIndexProgress).not.toHaveBeenCalled();
  });

  it('does not throw when progress handlers omit sendIndexProgress', () => {
    expect(() =>
      createGraphViewAnalysisProgressForwarder('analyze', {} as never)({
        phase: 'ignored',
        current: 1,
        total: 2,
      }),
    ).not.toThrow();
  });
});
