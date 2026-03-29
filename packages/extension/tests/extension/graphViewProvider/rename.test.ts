import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness } from './testHarness';

describe('GraphViewProvider rename and create dialogs', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('uses ignoreFocusOut: true in rename input box', async () => {
    const { getMessageHandler } = harness.createResolvedWebview();

    await getMessageHandler()({ type: 'RENAME_FILE', payload: { path: 'src/test.ts' } });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(harness.inputBoxCalls.length).toBeGreaterThan(0);
    expect(harness.inputBoxCalls[0].options).toBeDefined();
    expect(harness.inputBoxCalls[0].options!.ignoreFocusOut).toBe(true);
  });

  it('uses ignoreFocusOut: true in create file input box', async () => {
    const { getMessageHandler } = harness.createResolvedWebview();

    await getMessageHandler()({ type: 'CREATE_FILE', payload: { directory: '.' } });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(harness.inputBoxCalls.length).toBeGreaterThan(0);
    expect(harness.inputBoxCalls[0].options).toBeDefined();
    expect(harness.inputBoxCalls[0].options!.ignoreFocusOut).toBe(true);
  });
});
