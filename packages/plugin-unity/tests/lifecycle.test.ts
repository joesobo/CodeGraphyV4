import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { IPluginAnalysisContext } from '@codegraphy-dev/plugin-api';
import { createUnityPlugin } from '../src/lifecycle';

const playerControllerGuid = '11111111111111111111111111111111';

describe('createUnityPlugin', () => {
  it('exposes Unity manifest metadata and Graph Scope capabilities', () => {
    const plugin = createUnityPlugin();

    expect(plugin.id).toBe('codegraphy.unity');
    expect(plugin.name).toBe('Unity');
    expect(plugin.supportedExtensions).toEqual(expect.arrayContaining([
      '.unity',
      '.prefab',
      '.asset',
      '.mat',
      '.meta',
      '.asmdef',
      '.inputactions',
    ]));
    expect(plugin.defaultFilters).toEqual(expect.arrayContaining([
      '**/[Ll]ibrary/**',
      '**/[Tt]emp/**',
      '**/[Oo]bj/**',
      '**/[Pp]roject[Ss]ettings/**',
      '**/*.meta',
      '**/*.csproj',
      '**/*.sln',
    ]));
    expect(plugin.contributeGraphScopeCapabilities?.()).toEqual({
      nodeTypes: [
        'plugin:codegraphy.unity:symbol:game-object',
        'plugin:codegraphy.unity:symbol:component',
      ],
      edgeTypes: ['contains', 'reference', 'event'],
    });
    expect(plugin.contributeEdgeTypes?.() ?? []).toEqual([]);
    expect(plugin.fileColors).toEqual(expect.objectContaining({
      '*.unity': expect.objectContaining({
        color: '#F97316',
        imagePath: 'assets/unity.svg',
      }),
      '*.prefab': expect.objectContaining({
        color: '#8B5CF6',
        imagePath: 'assets/unity.svg',
      }),
      '*.asset': expect.objectContaining({
        color: '#0EA5E9',
        shape2D: 'triangle',
        imagePath: 'assets/unity.svg',
      }),
      '*.mat': expect.objectContaining({
        color: '#14B8A6',
        imagePath: 'assets/unity.svg',
      }),
    }));
  });

  it('ships Unity icons as white glyphs', () => {
    const unityIcon = readFileSync(new URL('../assets/unity.svg', import.meta.url), 'utf8');
    const packageIcon = readFileSync(new URL('../assets/icon.svg', import.meta.url), 'utf8');

    expect(unityIcon).toContain('fill="#fff"');
    expect(packageIcon).toContain('fill="#fff"');
    expect(unityIcon).not.toContain('#42a5f5');
    expect(packageIcon).not.toContain('#42a5f5');
  });

  it('uses .meta GUIDs to name MonoBehaviour components after their scripts', async () => {
    const plugin = createUnityPlugin();

    await plugin.onPreAnalyze?.([
      {
        absolutePath: '/workspace/Assets/Scripts/Player/PlayerController.cs.meta',
        relativePath: 'Assets/Scripts/Player/PlayerController.cs.meta',
        content: `guid: ${playerControllerGuid}`,
      },
    ], '/workspace');

    const analysis = await plugin.analyzeFile?.(
      '/workspace/Assets/Prefabs/Player.prefab',
      [
        '--- !u!1 &1000',
        'GameObject:',
        '  m_Name: Player',
        '--- !u!114 &1003',
        'MonoBehaviour:',
        '  m_GameObject: {fileID: 1000}',
        `  m_Script: {fileID: 11500000, guid: ${playerControllerGuid}, type: 3}`,
      ].join('\n'),
      '/workspace',
    );

    expect(analysis?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'Assets/Prefabs/Player.prefab#unity:component:1003',
        name: 'PlayerController',
      }),
    ]));
    expect(analysis?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'reference',
        toFilePath: '/workspace/Assets/Scripts/Player/PlayerController.cs',
      }),
    ]));
    expect(analysis?.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'plugin:codegraphy.unity:reference' }),
    ]));
  });

  it('scans hidden .meta sidecars through the workspace file system before analysis', async () => {
    const plugin = createUnityPlugin();
    const context: IPluginAnalysisContext = {
      mode: 'workspace',
      fileSystem: {
        exists: async () => true,
        isDirectory: async (filePath) => !filePath.endsWith('.meta'),
        isFile: async (filePath) => filePath.endsWith('.meta'),
        listDirectory: async (filePath) => {
          if (filePath === '/workspace') {
            return ['Assets'];
          }
          if (filePath === '/workspace/Assets') {
            return ['Scripts'];
          }
          if (filePath === '/workspace/Assets/Scripts') {
            return ['PlayerController.cs.meta'];
          }
          return [];
        },
        readTextFile: async (filePath) => (
          filePath.endsWith('PlayerController.cs.meta')
            ? `guid: ${playerControllerGuid}`
            : null
        ),
      },
    };

    await plugin.onPreAnalyze?.([], '/workspace', context);
    const analysis = await plugin.analyzeFile?.(
      '/workspace/Assets/Prefabs/Player.prefab',
      [
        '--- !u!1 &1000',
        'GameObject:',
        '  m_Name: Player',
        '--- !u!114 &1003',
        'MonoBehaviour:',
        '  m_GameObject: {fileID: 1000}',
        `  m_Script: {fileID: 11500000, guid: ${playerControllerGuid}, type: 3}`,
      ].join('\n'),
      '/workspace',
      context,
    );

    expect(analysis?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'PlayerController' }),
    ]));
    expect(analysis?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'script-guid',
        toFilePath: '/workspace/Assets/Scripts/PlayerController.cs',
      }),
    ]));
  });

  it('returns no symbols for non-serialized Unity files', async () => {
    const plugin = createUnityPlugin();
    const analysis = await plugin.analyzeFile?.(
      '/workspace/Assets/Input/Controls.inputactions',
      '{}',
      '/workspace',
    );

    expect(analysis).toEqual({
      filePath: '/workspace/Assets/Input/Controls.inputactions',
      relations: [],
    });
  });
});
