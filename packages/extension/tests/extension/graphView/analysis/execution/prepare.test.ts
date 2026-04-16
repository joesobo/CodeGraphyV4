import { describe, expect, it, vi } from 'vitest';
import { prepareGraphViewAnalysis } from '../../../../../src/extension/graphView/analysis/execution/prepare';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from './fixtures';

describe('graph view analysis execution prepare', () => {
  it('returns before doing any work when the request is already stale', async () => {
    const state = createExecutionState();
    const { handlers } = createExecutionHandlers({
      isAnalysisStale: vi.fn(() => true),
    });

    await expect(
      prepareGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);

    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
  });

  it('publishes an empty graph when no analyzer exists', async () => {
    const state = createExecutionState();
    const { handlers } = createExecutionHandlers();

    await expect(
      prepareGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);

    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.setGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('stops when the request turns stale after initialization', async () => {
    const initialize = vi.fn(async () => undefined);
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer({
        initialize,
      }),
    });
    const { handlers } = createExecutionHandlers({
      isAnalysisStale: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
    });

    await expect(
      prepareGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);

    expect(initialize).toHaveBeenCalledOnce();
    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
  });

  it('stops when installed plugin activation finishes after the request turns stale', async () => {
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer(),
      installedPluginActivationPromise: Promise.resolve(),
    });
    const { handlers } = createExecutionHandlers({
      isAnalysisStale: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
    });

    await expect(
      prepareGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);

    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
    expect(handlers.sendGroupsUpdated).not.toHaveBeenCalled();
  });

  it('stops when the request turns stale after recomputing groups and before publishing them', async () => {
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer(),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers({
      isAnalysisStale: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
    });

    await expect(
      prepareGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);

    expect(handlers.computeMergedGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).not.toHaveBeenCalled();
    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
  });

  it('publishes an empty graph after group recompute when no workspace is available', async () => {
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer(),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers({
      hasWorkspace: vi.fn(() => false),
    });

    await expect(
      prepareGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);

    expect(handlers.computeMergedGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('returns true after plugin activation, initialization, and group preparation succeed', async () => {
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer(),
      analyzerInitialized: true,
      installedPluginActivationPromise: Promise.resolve(),
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      prepareGraphViewAnalysis(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.computeMergedGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
  });
});
