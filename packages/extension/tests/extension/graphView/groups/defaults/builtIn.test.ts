import * as vscode from 'vscode';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getBuiltInGraphViewDefaultGroups } from '../../../../../src/extension/graphView/groups/defaults/builtIn';

describe('graphView/builtInDefaultGroups', () => {
  it('materializes matching Material theme defaults for the current graph and keeps Material Icon Theme metadata', () => {
    const groups = getBuiltInGraphViewDefaultGroups(
      {
        nodes: [
          { id: 'package.json', label: 'package.json', color: '#000000' },
          { id: 'src/main.tsx', label: 'main.tsx', color: '#000000' },
          { id: 'src/format.py', label: 'format.py', color: '#000000' },
          { id: 'README.md', label: 'README.md', color: '#000000' },
          { id: 'vite.config.ts', label: 'vite.config.ts', color: '#000000' },
        ],
        edges: [],
      },
      vscode.Uri.file(path.resolve(process.cwd(), '../..')),
    );

    expect(groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'default:fileName:package.json',
        pattern: 'package.json',
        color: '#8BC34A',
        isPluginDefault: true,
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
      expect.objectContaining({
        id: 'default:fileExtension:tsx',
        pattern: '*.tsx',
        color: '#0288D1',
        isPluginDefault: true,
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
      expect.objectContaining({
        id: 'default:fileExtension:py',
        pattern: '*.py',
        color: '#0288D1',
        isPluginDefault: true,
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
      expect.objectContaining({
        id: 'default:fileName:README.md',
        pattern: 'README.md',
        color: '#42A5F5',
        isPluginDefault: true,
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
      expect.objectContaining({
        id: 'default:fileName:vite.config.ts',
        pattern: 'vite.config.ts',
        color: '#AA00FF',
        isPluginDefault: true,
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
      expect.objectContaining({
        id: 'default:fileName:.codegraphy/settings.json',
        pattern: '.codegraphy/settings.json',
        color: '#277ACC',
        isPluginDefault: true,
        pluginName: 'Material Icon Theme',
      }),
    ]));
  });
});
