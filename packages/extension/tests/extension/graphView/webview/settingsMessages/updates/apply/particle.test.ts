import { describe, expect, it } from 'vitest';
import { applyParticleSettingMessage } from '../../../../../../../src/extension/graphView/webview/settingsMessages/updates/apply/particle';
import { createHandlers } from '../../testSupport';

describe('settingsMessages/updates/apply/particle', () => {
  it('persists particle setting updates', async () => {
    const handlers = createHandlers();

    await expect(applyParticleSettingMessage(
      { type: 'UPDATE_PARTICLE_SETTING', payload: { key: 'particleSpeed', value: 0.4 } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('particleSpeed', 0.4);
  });

  it('ignores unrelated messages', async () => {
    await expect(applyParticleSettingMessage(
      { type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: true } },
      createHandlers(),
    )).resolves.toBe(false);
  });
});
