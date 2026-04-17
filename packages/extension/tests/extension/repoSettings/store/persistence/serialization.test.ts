import { describe, expect, it } from 'vitest';
import { createDefaultCodeGraphyRepoSettings } from '../../../../../src/extension/repoSettings/defaults';
import { serializeSettings } from '../../../../../src/extension/repoSettings/store/persistence/serialization';

type LegacySettingsShape = ReturnType<typeof createDefaultCodeGraphyRepoSettings> & {
  exclude?: string[];
  folderNodeColor?: string;
  nodeColors?: unknown;
};

describe('extension/repoSettings/store/persistence/serialization', () => {
  it('removes legacy fields and backfills folder node colors into nodeColors', () => {
    const settings: LegacySettingsShape = createDefaultCodeGraphyRepoSettings();
    settings.exclude = ['legacy'];
    settings.folderNodeColor = '#445566';
    settings.nodeColors = { file: '#111111' };

    const serialized = serializeSettings(settings);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;

    expect(serialized.endsWith('\n')).toBe(true);
    expect(parsed.exclude).toBeUndefined();
    expect(parsed.folderNodeColor).toBeUndefined();
    expect(parsed.nodeColors).toEqual({
      file: '#111111',
      folder: '#445566',
    });
    expect(settings.exclude).toEqual(['legacy']);
    expect(settings.folderNodeColor).toBe('#445566');
  });

  it('prefers an explicit folder color over the legacy folderNodeColor alias', () => {
    const settings: LegacySettingsShape = createDefaultCodeGraphyRepoSettings();
    settings.folderNodeColor = '#445566';
    settings.nodeColors = { folder: '#123456', file: '#111111' };

    const parsed = JSON.parse(serializeSettings(settings)) as Record<string, unknown>;

    expect(parsed.nodeColors).toEqual({
      folder: '#123456',
      file: '#111111',
    });
  });

  it('writes an empty nodeColors object when the persisted value is malformed', () => {
    const settings = createDefaultCodeGraphyRepoSettings() as Omit<LegacySettingsShape, 'nodeColors'> & {
      nodeColors: unknown;
    };
    settings.nodeColors = 'invalid';
    settings.folderNodeColor = '';

    const parsed = JSON.parse(
      serializeSettings(settings as ReturnType<typeof createDefaultCodeGraphyRepoSettings>),
    ) as Record<string, unknown>;

    expect(parsed.nodeColors).toEqual({ folder: '' });
  });
});
