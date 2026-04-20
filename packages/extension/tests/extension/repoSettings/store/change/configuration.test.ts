import { describe, expect, it } from 'vitest';
import { affectsSettingsConfiguration } from '../../../../../src/extension/repoSettings/store/change/configuration';

describe('extension/repoSettings/store/change/configuration', () => {
  it('always matches the root codegraphy section', () => {
    expect(affectsSettingsConfiguration([], 'codegraphy')).toBe(true);
  });

  it('ignores non-codegraphy sections', () => {
    expect(affectsSettingsConfiguration(['legend'], 'workbench.colorTheme')).toBe(false);
    expect(affectsSettingsConfiguration(['legend'], 'xxxxxxxxxxxlegend')).toBe(false);
  });

  it('matches exact, parent, and child sections', () => {
    const changedKeys = [
      'legend',
      'timeline.playbackSpeed',
      'nodeColors.folder',
    ];

    expect(affectsSettingsConfiguration(changedKeys, 'codegraphy.legend')).toBe(true);
    expect(affectsSettingsConfiguration(changedKeys, 'codegraphy.groups')).toBe(false);
    expect(affectsSettingsConfiguration(changedKeys, 'codegraphy.timeline')).toBe(true);
    expect(affectsSettingsConfiguration(changedKeys, 'codegraphy.timeline.playbackSpeed')).toBe(true);
    expect(affectsSettingsConfiguration(changedKeys, 'codegraphy.folderNodeColor')).toBe(false);
    expect(affectsSettingsConfiguration(changedKeys, 'codegraphy.nodeColors')).toBe(true);
    expect(affectsSettingsConfiguration(changedKeys, 'codegraphy.maxFiles')).toBe(false);
  });
});
