import { describe, expect, it, vi } from 'vitest';
import { applyGraphControlMessage } from '../../../../../../src/extension/graphView/webview/settingsMessages/updates/graphControls';
import { createHandlers } from '../testSupport';

describe('settingsMessages/updates/graphControls', () => {
  it('updates graph control config maps and publishes refreshed controls', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(_: string, defaultValue: T): T => (
        ({ ...defaultValue, file: true } as T)
      )),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'package', visible: false } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', {
      file: true,
      package: false,
    });
    expect(handlers.sendGraphControls).toHaveBeenCalledOnce();
  });
});
