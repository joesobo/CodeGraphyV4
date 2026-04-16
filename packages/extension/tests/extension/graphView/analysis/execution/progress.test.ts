import { describe, expect, it } from 'vitest';
import {
  createGraphViewAnalysisProgressForwarder,
  sendInitialGraphViewAnalysisProgress,
} from '../../../../../src/extension/graphView/analysis/execution/progress';
import { createExecutionHandlers } from './fixtures';

describe('graph view analysis execution progress', () => {
  it('forwards progress updates with the phase label for the current mode', () => {
    const { handlers } = createExecutionHandlers();

    createGraphViewAnalysisProgressForwarder('refresh', handlers)({
      phase: 'ignored',
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
      phase: 'Indexing Repo',
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
