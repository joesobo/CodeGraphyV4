import { describe, expect, it } from 'vitest';
import { getBuiltInGraphViewDefaultGroups } from '../../../src/extension/graphView/builtInDefaultGroups';

describe('graphView/builtInDefaultGroups', () => {
  it('builds every built-in default group with CodeGraphy metadata', () => {
    expect(getBuiltInGraphViewDefaultGroups()).toEqual([
      {
        id: 'default:.gitignore',
        pattern: '.gitignore',
        color: '#F97583',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
      {
        id: 'default:*.json',
        pattern: '*.json',
        color: '#F9C74F',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
      {
        id: 'default:*.png',
        pattern: '*.png',
        color: '#90BE6D',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
      {
        id: 'default:*.jpg',
        pattern: '*.jpg',
        color: '#90BE6D',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
      {
        id: 'default:*.svg',
        pattern: '*.svg',
        color: '#43AA8B',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
      {
        id: 'default:*.md',
        pattern: '*.md',
        color: '#577590',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
      {
        id: 'default:*.jpeg',
        pattern: '*.jpeg',
        color: '#90BE6D',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
      {
        id: 'default:.vscode/settings.json',
        pattern: '.vscode/settings.json',
        color: '#277ACC',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
    ]);
  });
});
