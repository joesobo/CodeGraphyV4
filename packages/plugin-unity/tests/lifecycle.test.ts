import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IPluginAnalysisContext } from '@codegraphy-dev/plugin-api';
import { createUnityPlugin } from '../src/plugin';

const playerControllerGuid = '11111111111111111111111111111111';

function resolveAssetPath(fileName: string): string {
  const candidates = [
    join(process.cwd(), 'assets', fileName),
    join(process.cwd(), 'packages', 'plugin-unity', 'assets', fileName),
  ];
  const assetPath = candidates.find(candidate => existsSync(candidate));
  if (!assetPath) {
    throw new Error(`Unable to find Unity test asset '${fileName}'.`);
  }
  return assetPath;
}

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
    expect(plugin.contributeNodeTypes?.()).toEqual([
      expect.objectContaining({
        id: 'plugin:codegraphy.unity:symbol',
        label: 'Unity',
        matchSymbolSource: 'codegraphy.unity',
      }),
      expect.objectContaining({
        id: 'plugin:codegraphy.unity:symbol:game-object',
        parentId: 'plugin:codegraphy.unity:symbol',
        matchSymbolPluginKind: 'game-object',
      }),
      expect.objectContaining({
        id: 'plugin:codegraphy.unity:symbol:component',
        parentId: 'plugin:codegraphy.unity:symbol',
        matchSymbolPluginKind: 'component',
      }),
    ]);
    expect(plugin.contributeEdgeTypes?.() ?? []).toEqual([]);
  });

  it.skipIf(process.env.CODEGRAPHY_MUTATION_RUN === '1')('ships Unity icons as white glyphs', () => {
    const unityIcon = readFileSync(resolveAssetPath('unity.svg'), 'utf8');
    const packageIcon = readFileSync(resolveAssetPath('icon.svg'), 'utf8');

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
