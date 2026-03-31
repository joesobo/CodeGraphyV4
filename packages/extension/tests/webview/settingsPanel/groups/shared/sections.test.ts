import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import {
  groupSettingsPanelSections,
  replaceSettingsPanelUserGroups,
} from '../../../../../src/webview/components/settingsPanel/groups/shared/sections';

describe('settingsPanel groups sections', () => {
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
      ]),
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

  it('uses unknown fallbacks when a plugin default id does not match the plugin prefix', () => {
    expect(
      groupSettingsPanelSections([
        {
          id: 'custom:plugin:python:tests',
          pattern: '**/test_*.py',
          color: '#10B981',
          isPluginDefault: true,
        },
      ]),
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
      ]),
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

  it('replaces only the custom groups while preserving default section groups', () => {
    const groups: IGroup[] = [
      { id: 'custom:src', pattern: 'src/**', color: '#3B82F6' },
      {
        id: 'plugin:python:tests',
        pattern: '**/test_*.py',
        color: '#10B981',
        isPluginDefault: true,
        pluginName: 'Python',
      },
    ];

    expect(
      replaceSettingsPanelUserGroups(groups, [
        { id: 'custom:test', pattern: 'test/**', color: '#F97316' },
      ]),
    ).toEqual([
      { id: 'custom:test', pattern: 'test/**', color: '#F97316' },
      {
        id: 'plugin:python:tests',
        pattern: '**/test_*.py',
        color: '#10B981',
        isPluginDefault: true,
        pluginName: 'Python',
      },
    ]);
  });
});
