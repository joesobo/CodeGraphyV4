import { describe, expect, it } from 'vitest';
import { createDefaultCodeGraphyRepoSettings } from '../../../../../src/extension/repoSettings/defaults';
import { serializeSettings } from '../../../../../src/extension/repoSettings/store/persistence/serialization';

type LegacySettingsShape = ReturnType<typeof createDefaultCodeGraphyRepoSettings> & {
  exclude?: string[];
  edgeColors?: Record<string, string>;
  folderNodeColor?: string;
  nodeColors?: unknown;
  plugins?: string[];
};

describe('extension/repoSettings/store/persistence/serialization', () => {
  it('drops fields that are not part of the repo settings schema', () => {
    const settings: LegacySettingsShape = createDefaultCodeGraphyRepoSettings();
    settings.exclude = ['legacy'];
    settings.edgeColors = { import: '#123456' };
    settings.folderNodeColor = '#445566';
    settings.plugins = ['codegraphy.typescript'];

    const serialized = serializeSettings(settings);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;

    expect(serialized.endsWith('\n')).toBe(true);
    expect(parsed.exclude).toBeUndefined();
    expect(parsed.edgeColors).toBeUndefined();
    expect(parsed.folderNodeColor).toBeUndefined();
    expect(parsed.plugins).toBeUndefined();
    expect(settings.exclude).toEqual(['legacy']);
    expect(settings.edgeColors).toEqual({ import: '#123456' });
    expect(settings.folderNodeColor).toBe('#445566');
    expect(settings.plugins).toEqual(['codegraphy.typescript']);
  });

  it('keeps malformed values for known settings so validation remains explicit', () => {
    const settings = createDefaultCodeGraphyRepoSettings() as Omit<LegacySettingsShape, 'nodeColors'> & {
      nodeColors: unknown;
    };
    settings.nodeColors = 'invalid';

    const parsed = JSON.parse(
      serializeSettings(settings as ReturnType<typeof createDefaultCodeGraphyRepoSettings>),
    ) as Record<string, unknown>;

    expect(parsed.nodeColors).toBe('invalid');
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
    settings.nodeColorEnabled = {
      ...settings.nodeColorEnabled,
      symbol: true,
      'symbol:function': true,
      'symbol:method': true,
      'symbol:namespace': true,
      'symbol:variable': true,
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

    expect(parsed.nodeColors.symbol).toBeUndefined();
    expect(parsed.nodeColors['symbol:function']).toBe('#8B5CF6');
    expect(parsed.nodeColors['symbol:method']).toBeUndefined();
    expect(parsed.nodeColors['symbol:namespace']).toBeUndefined();
    expect(parsed.nodeColors['symbol:variable']).toBeUndefined();
    expect(parsed.nodeColorEnabled.symbol).toBeUndefined();
    expect(parsed.nodeColorEnabled['symbol:function']).toBe(true);
    expect(parsed.nodeVisibility.symbol).toBe(true);
    expect(parsed.nodeVisibility['symbol:function']).toBe(true);
    expect(parsed.nodeVisibility['symbol:method']).toBeUndefined();
    expect(parsed.nodeVisibility['symbol:namespace']).toBeUndefined();
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

    const parsed = JSON.parse(serializeSettings(settings)) as Record<string, unknown>;

    expect(parsed.legend).toEqual([
      { pattern: 'src/**', color: '#123456', target: 'node' },
    ]);
  });

  it('serializes graph layout pin records', () => {
    const settings = createDefaultCodeGraphyRepoSettings();
    settings.graphLayout = {
      collapsedNodes: {},
      pinnedNodes: {
        'src/a.ts': {
          nodeId: 'src/a.ts',
          '2D': { x: 10, y: 20 },
        },
      },
    };

    const parsed = JSON.parse(serializeSettings(settings)) as Record<string, unknown>;

    expect(parsed.graphLayout).toEqual(settings.graphLayout);
  });
});
