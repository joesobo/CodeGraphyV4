import { describe, expect, it } from 'vitest';
import {
  getPathSegments,
  normalizeSettingsKeyAlias,
} from '../../../src/extension/repoSettings/storeAliases';

describe('extension/repoSettings/storeAliases', () => {
  it('normalizes legacy settings aliases to their persisted keys', () => {
    expect(normalizeSettingsKeyAlias('folderNodeColor')).toBe('nodeColors.folder');
    expect(normalizeSettingsKeyAlias('groups')).toBe('legend');
    expect(normalizeSettingsKeyAlias('groups.0.pattern')).toBe('legend.0.pattern');
    expect(normalizeSettingsKeyAlias('exclude')).toBe('filterPatterns');
    expect(normalizeSettingsKeyAlias('timeline.playbackSpeed')).toBe('timeline.playbackSpeed');
  });

  it('splits normalized keys into non-empty path segments', () => {
    expect(getPathSegments('groups.0.pattern')).toEqual(['legend', '0', 'pattern']);
    expect(getPathSegments('.timeline..playbackSpeed.')).toEqual(['timeline', 'playbackSpeed']);
    expect(getPathSegments('')).toEqual([]);
  });
});
