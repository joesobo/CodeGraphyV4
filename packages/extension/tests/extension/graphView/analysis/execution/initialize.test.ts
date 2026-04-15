import { describe, expect, it, vi } from 'vitest';
import {
  awaitGraphViewPluginActivation,
  ensureGraphViewAnalyzerInitialized,
} from '../../../../../src/extension/graphView/analysis/execution/initialize';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from './fixtures';

describe('graph view analysis execution initialize', () => {
  it('returns true immediately when the analyzer is already initialized', async () => {
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer(),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      ensureGraphViewAnalyzerInitialized(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(true);

    expect(state.analyzer?.initialize).not.toHaveBeenCalled();
  });

  it('returns false when no analyzer exists', async () => {
    const state = createExecutionState();
    const { handlers } = createExecutionHandlers();

    await expect(
      ensureGraphViewAnalyzerInitialized(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);
  });

  it('initializes the analyzer once and clears the cached promise', async () => {
    const initialize = vi.fn(async () => undefined);
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer({
        initialize,
      }),
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      ensureGraphViewAnalyzerInitialized(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(true);

    expect(initialize).toHaveBeenCalledOnce();
    expect(state.analyzerInitialized).toBe(true);
    expect(state.analyzerInitPromise).toBeUndefined();
  });

  it('reuses an in-flight analyzer initialization promise', async () => {
    const initialize = vi.fn(async () => undefined);
    const analyzerInitPromise = Promise.resolve().then(() => undefined);
    const state = createExecutionState({
      analyzer: createExecutionAnalyzer({
        initialize,
      }),
      analyzerInitPromise,
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      ensureGraphViewAnalyzerInitialized(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(true);

    expect(initialize).not.toHaveBeenCalled();
    expect(state.analyzerInitialized).toBe(false);
    expect(state.analyzerInitPromise).toBe(analyzerInitPromise);
  });

  it('returns false when the request turns stale after plugin activation', async () => {
    const state = createExecutionState({
      installedPluginActivationPromise: Promise.resolve(),
    });
    const { handlers } = createExecutionHandlers({
      isAnalysisStale: vi.fn(() => true),
    });

    await expect(
      awaitGraphViewPluginActivation(new AbortController().signal, 1, state, handlers),
    ).resolves.toBe(false);
  });
});
