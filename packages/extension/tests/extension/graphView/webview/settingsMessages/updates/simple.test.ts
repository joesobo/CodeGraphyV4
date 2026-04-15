import { describe, expect, it } from 'vitest';
import { applySimpleSettingsUpdate } from '../../../../../../src/extension/graphView/webview/settingsMessages/updates/simple';
import { createHandlers } from '../testSupport';

describe('settingsMessages/updates/simple', () => {
  it('updates supported config keys and ignores unrelated messages', async () => {
    const handlers = createHandlers();

    await expect(
      applySimpleSettingsUpdate(
        { type: 'UPDATE_BIDIRECTIONAL_MODE', payload: { bidirectionalMode: 'combined' } },
        handlers,
      ),
    ).resolves.toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('bidirectionalEdges', 'combined');

    await expect(
      applySimpleSettingsUpdate({ type: 'TOGGLE_PLUGIN', payload: { pluginId: 'x', enabled: false } }, handlers),
    ).resolves.toBe(false);
  });
});
