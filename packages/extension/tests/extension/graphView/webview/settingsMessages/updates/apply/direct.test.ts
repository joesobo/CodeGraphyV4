import { describe, expect, it } from 'vitest';
import { applyDirectSettingsUpdateMessage } from '../../../../../../../src/extension/graphView/webview/settingsMessages/updates/apply/direct';
import { createHandlers, createState } from '../../testSupport';

describe('settingsMessages/updates/apply/direct', () => {
  it('routes direct filter, label, and plugin-order updates before stateless settings', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(applyDirectSettingsUpdateMessage(
      { type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } },
      state,
      handlers,
    )).resolves.toBe(true);
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
  });

  it('routes stateless simple and particle updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(applyDirectSettingsUpdateMessage(
      { type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: false } },
      state,
      handlers,
    )).resolves.toBe(true);
    await expect(applyDirectSettingsUpdateMessage(
      { type: 'UPDATE_PARTICLE_SETTING', payload: { key: 'particleSpeed', value: 0.2 } },
      state,
      handlers,
    )).resolves.toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('showOrphans', false);
    expect(handlers.updateConfig).toHaveBeenCalledWith('particleSpeed', 0.2);
  });

  it('returns false for messages outside settings updates', async () => {
    await expect(applyDirectSettingsUpdateMessage(
      { type: 'TOGGLE_PLUGIN', payload: { pluginId: 'plugin', enabled: true } },
      createState(),
      createHandlers(),
    )).resolves.toBe(false);
  });
});
