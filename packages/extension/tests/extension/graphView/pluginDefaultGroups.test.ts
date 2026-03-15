import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { getGraphViewPluginDefaultGroups } from '../../../src/extension/graphView/pluginDefaultGroups';

describe('graphView/pluginDefaultGroups', () => {
  it('builds plugin default groups and registers built-in asset roots', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              builtIn: true,
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
                fileColors: {
                  '*.ts': '#3178C6',
                  '*.tsx': {
                    color: '#3178C6',
                    shape2D: 'hexagon',
                    image: 'assets/ts.svg',
                  },
                },
              },
            },
          ],
        },
      },
      new Set<string>(),
      pluginExtensionUris,
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.typescript:*.ts',
        pattern: '*.ts',
        color: '#3178C6',
        isPluginDefault: true,
        pluginName: 'TypeScript',
      },
      {
        id: 'plugin:codegraphy.typescript:*.tsx',
        pattern: '*.tsx',
        color: '#3178C6',
        isPluginDefault: true,
        pluginName: 'TypeScript',
        shape2D: 'hexagon',
        imagePath: 'assets/ts.svg',
      },
    ]);
    expect(pluginExtensionUris.get('codegraphy.typescript')?.fsPath).toBe(
      '/test/extension/packages/plugin-typescript',
    );
  });

  it('skips disabled plugins and deduplicates duplicate patterns', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
                fileColors: { '*.ts': '#3178C6' },
              },
            },
            {
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
                fileColors: { '*.ts': '#3178C6' },
              },
            },
            {
              plugin: {
                id: 'codegraphy.python',
                name: 'Python',
                fileColors: { '*.py': '#3776AB' },
              },
            },
          ],
        },
      },
      new Set(['codegraphy.typescript']),
      new Map<string, vscode.Uri>(),
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.python:*.py',
        pattern: '*.py',
        color: '#3776AB',
        isPluginDefault: true,
        pluginName: 'Python',
      },
    ]);
  });
});
