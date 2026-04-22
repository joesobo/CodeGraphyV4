import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../src/shared/settings/groups';
import {
  createCustomRuleGroup,
  createPluginRuleGroups,
} from '../../../../src/webview/components/legends/panel/section/groups';

describe('webview/legends/sectionGroups', () => {
  it('keeps custom rules in flat display order with their original indexes', () => {
    const rules: IGroup[] = [
      { id: 'custom:first', pattern: 'src/**', color: '#111111' },
      { id: 'plugin:typescript:*.ts', pattern: '*.ts', color: '#222222', isPluginDefault: true },
      { id: 'custom:second', pattern: 'tests/**', color: '#333333' },
    ];

    expect(createCustomRuleGroup(rules)).toEqual({
      id: 'custom',
      label: 'Custom',
      rules: [
        { index: 0, rule: rules[0] },
        { index: 2, rule: rules[2] },
      ],
    });
  });

  it('groups plugin rules by plugin id without losing flat display indexes', () => {
    const rules: IGroup[] = [
      { id: 'custom:first', pattern: 'src/**', color: '#111111' },
      {
        id: 'plugin:typescript:*.ts',
        pattern: '*.ts',
        color: '#222222',
        isPluginDefault: true,
        pluginId: 'codegraphy.typescript',
        pluginName: 'TypeScript',
      },
      {
        id: 'plugin:python:*.py',
        pattern: '*.py',
        color: '#333333',
        isPluginDefault: true,
        pluginId: 'codegraphy.python',
        pluginName: 'Python',
      },
      {
        id: 'plugin:typescript:*.tsx',
        pattern: '*.tsx',
        color: '#444444',
        isPluginDefault: true,
        pluginId: 'codegraphy.typescript',
        pluginName: 'TypeScript',
      },
    ];

    expect(createPluginRuleGroups(rules)).toEqual([
      {
        id: 'codegraphy.typescript',
        label: 'TypeScript',
        rules: [
          { index: 1, rule: rules[1] },
          { index: 3, rule: rules[3] },
        ],
      },
      {
        id: 'codegraphy.python',
        label: 'Python',
        rules: [{ index: 2, rule: rules[2] }],
      },
    ]);
  });
});
