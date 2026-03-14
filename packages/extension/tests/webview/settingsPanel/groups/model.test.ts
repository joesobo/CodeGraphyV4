import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../src/shared/types';
import {
  buildSettingsGroupOverride,
  groupSettingsPanelSections,
  reorderSettingsGroups,
} from '../../../../src/webview/components/settingsPanel/groups/model';

describe('settingsPanel groups model', () => {
  it('groups custom and default settings panel groups into visible sections', () => {
    const groups: IGroup[] = [
      { id: 'custom:src', pattern: 'src/**', color: '#3B82F6' },
      {
        id: 'default:typescript',
        pattern: '**/*.ts',
        color: '#2563EB',
        isPluginDefault: true,
        pluginName: 'TypeScript',
      },
      {
        id: 'plugin:python:tests',
        pattern: '**/test_*.py',
        color: '#10B981',
        isPluginDefault: true,
        pluginName: 'Python',
      },
    ];

    expect(groupSettingsPanelSections(groups)).toEqual({
      userGroups: [{ id: 'custom:src', pattern: 'src/**', color: '#3B82F6' }],
      defaultSections: [
        {
          sectionId: 'default',
          sectionName: 'TypeScript',
          groups: [
            {
              id: 'default:typescript',
              pattern: '**/*.ts',
              color: '#2563EB',
              isPluginDefault: true,
              pluginName: 'TypeScript',
            },
          ],
        },
        {
          sectionId: 'python',
          sectionName: 'Python',
          groups: [
            {
              id: 'plugin:python:tests',
              pattern: '**/test_*.py',
              color: '#10B981',
              isPluginDefault: true,
              pluginName: 'Python',
            },
          ],
        },
      ],
    });
  });

  it('groups multiple plugin defaults into the same section', () => {
    const groups: IGroup[] = [
      {
        id: 'plugin:python:tests',
        pattern: '**/test_*.py',
        color: '#10B981',
        isPluginDefault: true,
        pluginName: 'Python',
      },
      {
        id: 'plugin:python:src',
        pattern: 'src/**/*.py',
        color: '#22C55E',
        isPluginDefault: true,
        pluginName: 'Python',
      },
    ];

    expect(groupSettingsPanelSections(groups)).toEqual({
      userGroups: [],
      defaultSections: [
        {
          sectionId: 'python',
          sectionName: 'Python',
          groups,
        },
      ],
    });
  });

  it('falls back to CodeGraphy for built-in defaults without a plugin name', () => {
    expect(
      groupSettingsPanelSections([
        {
          id: 'default:folders',
          pattern: 'src/**',
          color: '#64748B',
          isPluginDefault: true,
        },
      ])
    ).toEqual({
      userGroups: [],
      defaultSections: [
        {
          sectionId: 'default',
          sectionName: 'CodeGraphy',
          groups: [
            {
              id: 'default:folders',
              pattern: 'src/**',
              color: '#64748B',
              isPluginDefault: true,
            },
          ],
        },
      ],
    });
  });

  it('falls back to an unknown section when a plugin default id does not match the plugin prefix', () => {
    expect(
      groupSettingsPanelSections([
        {
          id: 'custom:plugin:python:tests',
          pattern: '**/test_*.py',
          color: '#10B981',
          isPluginDefault: true,
        },
      ])
    ).toEqual({
      userGroups: [],
      defaultSections: [
        {
          sectionId: 'unknown',
          sectionName: 'unknown',
          groups: [
            {
              id: 'custom:plugin:python:tests',
              pattern: '**/test_*.py',
              color: '#10B981',
              isPluginDefault: true,
            },
          ],
        },
      ],
    });
  });

  it('uses the plugin id as the section name when plugin defaults have no display name', () => {
    expect(
      groupSettingsPanelSections([
        {
          id: 'plugin:python:tests',
          pattern: '**/test_*.py',
          color: '#10B981',
          isPluginDefault: true,
        },
      ])
    ).toEqual({
      userGroups: [],
      defaultSections: [
        {
          sectionId: 'python',
          sectionName: 'python',
          groups: [
            {
              id: 'plugin:python:tests',
              pattern: '**/test_*.py',
              color: '#10B981',
              isPluginDefault: true,
            },
          ],
        },
      ],
    });
  });

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
      'plugin:godot:assets/godot.svg'
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

  it('reorders settings groups by moving the dragged group to the target index', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
      { id: 'c', pattern: 'c/**', color: '#333333' },
    ];

    expect(reorderSettingsGroups(groups, 0, 2).map((group) => group.id)).toEqual(['b', 'c', 'a']);
  });

  it('leaves settings groups unchanged when the drag indices do not produce a move', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
    ];

    expect(reorderSettingsGroups(groups, 1, 1)).toEqual(groups);
    expect(reorderSettingsGroups(groups, -1, 1)).toEqual(groups);
    expect(reorderSettingsGroups(groups, 1, -1)).toEqual(groups);
    expect(reorderSettingsGroups(groups, groups.length, 0)).toEqual(groups);
    expect(reorderSettingsGroups(groups, 0, 9)).toEqual(groups);
    expect(reorderSettingsGroups(groups, 0, groups.length)).toEqual(groups);
  });

  it('allows moving a group to index zero', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
      { id: 'c', pattern: 'c/**', color: '#333333' },
    ];

    expect(reorderSettingsGroups(groups, 2, 0).map((group) => group.id)).toEqual(['c', 'a', 'b']);
  });
});
