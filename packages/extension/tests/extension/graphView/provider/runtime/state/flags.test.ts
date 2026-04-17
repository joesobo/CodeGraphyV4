import { describe, expect, it } from 'vitest';
import { createGraphViewProviderRuntimeFlagState } from '../../../../../../src/extension/graphView/provider/runtime/state/flags';

describe('graphView/provider/runtime/state/flags', () => {
  it('creates the flag-backed runtime defaults', async () => {
    const state = createGraphViewProviderRuntimeFlagState();

    expect(state._analyzerInitialized).toBe(false);
    expect(state._analysisRequestId).toBe(0);
    expect(state._depthMode).toBe(false);
    expect(state._dagMode).toBeNull();
    expect(state._timelineActive).toBe(false);
    expect(state._firstAnalysis).toBe(true);
    expect(state._webviewReadyNotified).toBe(false);
    await expect(state._installedPluginActivationPromise).resolves.toBeUndefined();
  });
});
