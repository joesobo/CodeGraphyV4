import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../src/shared/contracts';
import { buildSettingsGroupOverride } from '../../../../src/webview/components/settingsPanel/groups/override';

describe('settingsPanel groups override', () => {
  it('builds override groups with plugin-qualified image paths for inherited plugin assets', () => {
    const group: IGroup = {
      id: 'plugin:godot:scenes',
      pattern: 'scenes/**',
      color: '#22C55E',
      imagePath: 'assets/godot.svg',
      shape2D: 'diamond',
      shape3D: 'cone',
      isPluginDefault: true,
    };

    expect(buildSettingsGroupOverride(group, { color: '#F97316' }, 'override-1')).toEqual({
      id: 'override-1',
      pattern: 'scenes/**',
      color: '#F97316',
      imagePath: 'plugin:godot:assets/godot.svg',
      shape2D: 'diamond',
      shape3D: 'cone',
    });
  });

  it('preserves already-qualified image paths when building override groups', () => {
    const group: IGroup = {
      id: 'plugin:godot:scenes',
      pattern: 'scenes/**',
      color: '#22C55E',
      imagePath: 'plugin:godot:assets/godot.svg',
      isPluginDefault: true,
    };

    expect(buildSettingsGroupOverride(group, {}, 'override-2').imagePath).toBe(
      'plugin:godot:assets/godot.svg',
    );
  });

  it('keeps relative image paths unchanged when the group id is not plugin-scoped', () => {
    const group: IGroup = {
      id: 'custom:scenes',
      pattern: 'scenes/**',
      color: '#22C55E',
      imagePath: 'assets/custom.svg',
    };

    expect(buildSettingsGroupOverride(group, {}, 'override-3').imagePath).toBe('assets/custom.svg');
  });

  it('does not infer a plugin prefix from ids that only contain a nested plugin token', () => {
    const group: IGroup = {
      id: 'custom:plugin:godot:scenes',
      pattern: 'scenes/**',
      color: '#22C55E',
      imagePath: 'assets/custom.svg',
    };

    expect(buildSettingsGroupOverride(group, {}, 'override-4').imagePath).toBe('assets/custom.svg');
  });
});
