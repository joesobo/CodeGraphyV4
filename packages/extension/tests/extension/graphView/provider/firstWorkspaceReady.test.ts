import { describe, expect, it } from 'vitest';
import { createFirstWorkspaceReadyState } from '../../../../src/extension/graphView/provider/firstWorkspaceReady';

describe('graphView/provider/firstWorkspaceReady', () => {
  it('resolves the promise when the ready callback is invoked', async () => {
    const ready = createFirstWorkspaceReadyState();

    ready.resolve();

    await expect(ready.promise).resolves.toBeUndefined();
  });
});
