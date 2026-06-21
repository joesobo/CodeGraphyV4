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

  it('adds scoped symbol defaults for core symbol kinds and Godot class names', () => {
    const groups = getBuiltInGraphViewDefaultGroups(
      {
        nodes: [
          {
            id: 'src/app.ts#format:function',
            label: 'format',
            color: '#000000',
            nodeType: 'symbol',
            symbol: {
              id: 'src/app.ts#format:function',
              name: 'format',
              kind: 'function',
              filePath: 'src/app.ts',
            },
          },
          {
            id: 'src/app.ts#render:method',
            label: 'render',
            color: '#000000',
            nodeType: 'symbol',
            symbol: {
              id: 'src/app.ts#render:method',
              name: 'render',
              kind: 'method',
              filePath: 'src/app.ts',
            },
          },
          {
            id: 'src/app.ts#User:type',
            label: 'User',
            color: '#000000',
            nodeType: 'symbol',
            symbol: {
              id: 'src/app.ts#User:type',
              name: 'User',
              kind: 'type',
              filePath: 'src/app.ts',
            },
          },
          {
            id: 'src/app.ts#currentUser:variable',
            label: 'currentUser',
            color: '#000000',
            nodeType: 'variable',
            symbol: {
              id: 'src/app.ts#currentUser:variable',
              name: 'currentUser',
              kind: 'variable',
              filePath: 'src/app.ts',
            },
          },
          {
            id: 'scripts/player.gd#Player:godot-class-name',
            label: 'Player',
            color: '#000000',
            nodeType: 'symbol',
            symbol: {
              id: 'scripts/player.gd#Player:godot-class-name',
              name: 'Player',
              kind: 'class',
              filePath: 'scripts/player.gd',
              pluginKind: 'godot-class-name',
              source: 'codegraphy.gdscript',
              language: 'gdscript',
            },
          },
        ],
        edges: [],
      },
      vscode.Uri.file(path.resolve(process.cwd(), '../..')),
    );

    expect(groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'default:symbol-kind:function',
        displayLabel: 'Function',
        pattern: '**',
        color: '#8B5CF6',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
        matchNodeType: 'symbol',
        matchSymbolKind: 'function',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      }),
      expect.objectContaining({
        id: 'default:symbol-kind:method',
        displayLabel: 'Method',
        pattern: '**',
        color: '#A855F7',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
        matchNodeType: 'symbol',
        matchSymbolKind: 'method',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      }),
      expect.objectContaining({
        id: 'default:symbol-kind:type',
        displayLabel: 'Type',
        pattern: '**',
        color: '#EC4899',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
        matchNodeType: 'symbol',
        matchSymbolKind: 'type',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      }),
      expect.objectContaining({
        id: 'default:symbol-kind:variable',
        displayLabel: 'Variable',
        pattern: '**',
        color: '#14B8A6',
        matchNodeType: 'variable',
        matchSymbolKind: 'variable',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      }),
      expect.objectContaining({
        id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
        displayLabel: 'class_name',
        pattern: '**',
        color: '#478CBF',
        matchNodeType: 'symbol',
        matchSymbolKind: 'class',
        matchSymbolPluginKind: 'godot-class-name',
        matchSymbolSource: 'codegraphy.gdscript',
        matchSymbolLanguage: 'gdscript',
        matchSymbolFilePath: '**/*.gd',
        isPluginDefault: true,
        pluginId: 'codegraphy.gdscript',
        pluginName: 'Godot',
      }),
    ]));

    expect(groups.map((group) => group.id)).not.toEqual(expect.arrayContaining([
      'default:symbol-kind:struct',
      'default:symbol-kind:enum',
      'default:symbol-kind:plugin',
    ]));
  });
});
