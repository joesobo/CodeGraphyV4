import { describe, expect, it } from 'vitest';
import { applyResetAllSettingsMessage } from '../../../../../../../src/extension/graphView/webview/settingsMessages/updates/apply/reset';
import { createHandlers } from '../../testSupport';

describe('settingsMessages/updates/apply/reset', () => {
  it('delegates reset-all messages', async () => {
    const handlers = createHandlers();

    await expect(applyResetAllSettingsMessage({ type: 'RESET_ALL_SETTINGS' }, handlers)).resolves.toBe(true);

    expect(handlers.resetAllSettings).toHaveBeenCalledOnce();
  });

  it('ignores unrelated messages', async () => {
    await expect(applyResetAllSettingsMessage(
      { type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: true } },
      createHandlers(),
    )).resolves.toBe(false);
  });
});
