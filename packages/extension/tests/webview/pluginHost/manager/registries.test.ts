import { describe, expect, it, vi } from 'vitest';
import {
  getOverlayEntries,
  getRendererFnsForType,
  type NodeRendererRegistry,
  type OverlayRegistry,
} from '../../../../src/webview/pluginHost/manager/registries';

describe('webview/pluginHost/manager/registries', () => {
  it('combines type-specific and wildcard renderers without duplicating wildcard lookups', () => {
    const typeRenderer = vi.fn();
    const wildcardRenderer = vi.fn();
    const renderers: NodeRendererRegistry = new Map([
      ['file', [{ pluginId: 'plugin.one', fn: typeRenderer }]],
      ['*', [{ pluginId: 'plugin.wildcard', fn: wildcardRenderer }]],
    ]);

    expect(getRendererFnsForType(renderers, 'file')).toEqual([typeRenderer, wildcardRenderer]);
    expect(getRendererFnsForType(renderers, '*')).toEqual([wildcardRenderer]);
    expect(getRendererFnsForType(new Map(), 'file')).toEqual([]);
  });

  it('returns overlay functions with their qualified ids', () => {
    const overlay = vi.fn();
    const overlays: OverlayRegistry = new Map([
      ['plugin.one:overlay', { pluginId: 'plugin.one', fn: overlay }],
    ]);

    expect(getOverlayEntries(overlays)).toEqual([{ id: 'plugin.one:overlay', fn: overlay }]);
  });
});
