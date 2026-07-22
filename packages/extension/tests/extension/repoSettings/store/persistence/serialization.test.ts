import { describe, expect, it } from 'vitest';
import { createDefaultCodeGraphyRepoSettings } from '../../../../../src/extension/repoSettings/defaults';
import { serializeSettings } from '../../../../../src/extension/repoSettings/store/persistence/serialization';

type LegacySettingsShape = ReturnType<typeof createDefaultCodeGraphyRepoSettings> & {
  exclude?: string[];
  edgeColors?: Record<string, string>;
  folderNodeColor?: string;
  nodeColors?: unknown;
  legacyPlugins?: string[];
};

function getExtensionData(serialized: string): Record<string, unknown> {
  const parsed = JSON.parse(serialized) as Record<string, unknown>;
  const interfaces = parsed.interfaces as Array<{ id: string; data: Record<string, unknown> }>;
  return interfaces.find(entry => entry.id === 'codegraphy.extension')?.data ?? {};
}

describe('extension/repoSettings/store/persistence/serialization', () => {
  it('drops fields that are not part of the repo settings schema', () => {
    const settings: LegacySettingsShape = createDefaultCodeGraphyRepoSettings();
    settings.exclude = ['legacy'];
    settings.edgeColors = { import: '#123456' };
    settings.folderNodeColor = '#445566';
    settings.legacyPlugins = ['codegraphy.typescript'];

    const serialized = serializeSettings(settings);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;

    expect(serialized.endsWith('\n')).toBe(true);
    expect(parsed.exclude).toBeUndefined();
    expect(parsed.edgeColors).toBeUndefined();
    expect(parsed.folderNodeColor).toBeUndefined();
    expect(parsed.legacyPlugins).toBeUndefined();
    expect(settings.exclude).toEqual(['legacy']);
    expect(settings.edgeColors).toEqual({ import: '#123456' });
    expect(settings.folderNodeColor).toBe('#445566');
    expect(settings.legacyPlugins).toEqual(['codegraphy.typescript']);
  });

  it('serializes plugin activity intent entries', () => {
    const settings = createDefaultCodeGraphyRepoSettings();
    settings.plugins = [
      { id: 'codegraphy.markdown', activation: 'enabled' },
      {
        id: 'codegraphy.vue',
        activation: 'disabled',
        options: { includeTests: true },
      },
    ];

    const parsed = JSON.parse(serializeSettings(settings)) as Record<string, unknown>;

    expect(parsed.plugins).toEqual([
      { id: 'codegraphy.markdown', activation: 'enabled' },
      {
        id: 'codegraphy.vue',
        activation: 'disabled',
        options: { includeTests: true },
      },
    ]);
  });

  it('stores Extension rendering intent in the open interface entry', () => {
    const settings = createDefaultCodeGraphyRepoSettings();
    settings.interfaces = [{
      id: 'codegraphy.extension',
      data: {
        pinnedNodes: [{ nodeId: 'src/app.ts', x: 10, y: 20 }],
      },
    }];
    settings.nodeColors = { file: '#123456' };
    settings.favorites = ['src/app.ts'];
    settings.directionMode = 'particles';
    settings.depthLimit = 4;
    settings.nodeSizeMode = 'file-size';
    settings.physics = { ...settings.physics, damping: 0.2 };

    const parsed = JSON.parse(serializeSettings(settings)) as Record<string, unknown>;
    const interfaces = parsed.interfaces as Array<{ id: string; data: Record<string, unknown> }>;
    const extensionData = interfaces.find(entry => entry.id === 'codegraphy.extension')?.data;

    expect(extensionData).toMatchObject({
      pinnedNodes: [{ nodeId: 'src/app.ts', x: 10, y: 20 }],
      nodeColors: { file: '#123456' },
      favorites: ['src/app.ts'],
      directionMode: 'particles',
      depthLimit: 4,
      nodeSizeMode: 'file-size',
      physics: { damping: 0.2 },
    });
    expect(parsed).not.toHaveProperty('nodeColors');
    expect(parsed).not.toHaveProperty('favorites');
    expect(parsed).not.toHaveProperty('directionMode');
    expect(parsed).not.toHaveProperty('depthLimit');
    expect(parsed).not.toHaveProperty('nodeSizeMode');
    expect(parsed).not.toHaveProperty('physics');
  });

  it('keeps malformed values for known settings so validation remains explicit', () => {
    const settings = createDefaultCodeGraphyRepoSettings() as Omit<LegacySettingsShape, 'nodeColors'> & {
      nodeColors: unknown;
    };
    settings.nodeColors = 'invalid';

    expect(getExtensionData(serializeSettings(
      settings as ReturnType<typeof createDefaultCodeGraphyRepoSettings>,
    )).nodeColors).toBe('invalid');
  });

  it('omits stale symbol theme keys from serialized settings', () => {
    const settings = createDefaultCodeGraphyRepoSettings();
    settings.nodeColors = {
      ...settings.nodeColors,
      symbol: '#8B5CF6',
      'symbol:function': '#8B5CF6',
      'symbol:method': '#A855F7',
      'symbol:namespace': '#64748B',
      'symbol:variable': '#14B8A6',
    };
    settings.nodeVisibility = {
      ...settings.nodeVisibility,
      symbol: true,
      'symbol:function': true,
      'symbol:method': true,
      'symbol:namespace': true,
      'symbol:variable': true,
    };

    const parsed = JSON.parse(serializeSettings(settings)) as Record<string, Record<string, unknown>>;
    const extensionData = getExtensionData(serializeSettings(settings));
    const nodeColors = extensionData.nodeColors as Record<string, string>;

    expect(nodeColors.symbol).toBe('#8B5CF6');
    expect(nodeColors['symbol:function']).toBe('#8B5CF6');
    expect(nodeColors['symbol:method']).toBe('#A855F7');
    expect(nodeColors['symbol:namespace']).toBe('#64748B');
    expect(nodeColors['symbol:variable']).toBeUndefined();
    expect(parsed.nodeColorEnabled).toBeUndefined();
    expect(parsed.nodeVisibility.symbol).toBe(true);
    expect(parsed.nodeVisibility['symbol:function']).toBe(true);
    expect(parsed.nodeVisibility['symbol:method']).toBe(true);
    expect(parsed.nodeVisibility['symbol:namespace']).toBe(true);
    expect(parsed.nodeVisibility['symbol:variable']).toBeUndefined();
  });

  it('omits runtime-only legend ids and metadata from persisted settings', () => {
    const settings = createDefaultCodeGraphyRepoSettings();
    settings.legend = [
      {
        id: 'legend:runtime',
        pattern: 'src/**',
        color: '#123456',
        target: 'node',
        imageUrl: 'webview://icon.png',
        isPluginDefault: true,
        pluginName: 'CodeGraphy',
      },
    ];

    const extensionData = getExtensionData(serializeSettings(settings));

    expect(extensionData.legend).toEqual([
      { pattern: 'src/**', color: '#123456', target: 'node' },
    ]);
  });

});
