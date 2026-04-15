import { describe, expect, it } from 'vitest';
import { applyPluginOrderUpdate } from '../../../../../../src/extension/graphView/webview/settingsMessages/updates/pluginOrder';
import { createHandlers } from '../testSupport';

describe('settingsMessages/updates/pluginOrder', () => {
  it('stores the plugin order and reprocesses the listed plugins', async () => {
    const handlers = createHandlers();

    await applyPluginOrderUpdate(
      {
        type: 'UPDATE_PLUGIN_ORDER',
        payload: { pluginIds: ['plugin.typescript', 'plugin.markdown'] },
      },
      handlers,
    );

    expect(handlers.updateConfig).toHaveBeenCalledWith('pluginOrder', [
      'plugin.typescript',
      'plugin.markdown',
    ]);
    expect(handlers.reprocessPluginFiles).toHaveBeenCalledWith([
      'plugin.typescript',
      'plugin.markdown',
    ]);
  });
});
