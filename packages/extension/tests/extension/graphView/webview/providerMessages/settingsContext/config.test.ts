import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SILENT_CONFIG_KEYS,
  createSettingsConfigPersistence,
} from '../../../../../../src/extension/graphView/webview/providerMessages/settingsContext/persistence';
import {
  getCodeGraphyConfiguration,
  updateCodeGraphyConfigurationSilently,
} from '../../../../../../src/extension/repoSettings/current';

vi.mock('../../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(),
}));

describe('graphView/webview/providerMessages/settingsContext/persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('declares the exact shared silent configuration keys', () => {
    expect([...SILENT_CONFIG_KEYS].sort()).toEqual([
      'bidirectionalEdges',
      'directionColor',
      'directionMode',
      'disabledCustomFilterPatterns',
      'disabledPluginFilterPatterns',
      'edgeVisibility',
      'filterPatterns',
      'maxFiles',
      'nodeColors',
      'nodeVisibility',
      'particleSize',
      'particleSpeed',
      'plugins',
      'showFps',
      'showLabels',
      'showMinimap',
    ]);
  });

  it('returns the current CodeGraphy configuration and persists silent keys without notifications', async () => {
    const config = { update: vi.fn() };
    vi.mocked(getCodeGraphyConfiguration).mockReturnValue(config as never);

    const persistence = createSettingsConfigPersistence({
      nodeSizeModeKey: 'nodeSizeMode',
    });

    expect(persistence.config).toBe(config);

    for (const key of SILENT_CONFIG_KEYS) {
      await persistence.persistConfig(key, `${key}-value`);
    }

    expect(updateCodeGraphyConfigurationSilently).toHaveBeenCalledTimes(SILENT_CONFIG_KEYS.size);
    expect(config.update).not.toHaveBeenCalled();
  });

  it('persists the node-size mode key silently even though it is not part of the shared key set', async () => {
    const config = { update: vi.fn() };
    vi.mocked(getCodeGraphyConfiguration).mockReturnValue(config as never);
    const persistence = createSettingsConfigPersistence({
      nodeSizeModeKey: 'nodeSizeMode',
    });

    await persistence.persistConfig('nodeSizeMode', 'connections');

    expect(updateCodeGraphyConfigurationSilently).toHaveBeenCalledWith(
      'nodeSizeMode',
      'connections',
    );
    expect(config.update).not.toHaveBeenCalled();
  });

  it('uses the normal configuration update path for non-silent keys', async () => {
    const config = { update: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(getCodeGraphyConfiguration).mockReturnValue(config as never);
    const persistence = createSettingsConfigPersistence({
      nodeSizeModeKey: 'nodeSizeMode',
    });

    await persistence.persistConfig('showOrphanHints', false);

    expect(config.update).toHaveBeenCalledWith('showOrphanHints', false);
    expect(updateCodeGraphyConfigurationSilently).not.toHaveBeenCalled();
  });
});
