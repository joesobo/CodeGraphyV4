import { describe, expect, it } from 'vitest';
import {
  getPluginsPanelItemClassName,
  getPluginsPanelWrapperClassName,
  reorderPluginStatuses,
} from '../../../src/webview/components/plugins/model';
import type { IPluginStatus } from '../../../src/shared/plugins/status';

describe('plugins panel model', () => {
  it('dims disabled plugin rows', () => {
    expect(getPluginsPanelWrapperClassName(false)).toBe('opacity-50');
  });

  it('leaves enabled plugin rows undimmed', () => {
    expect(getPluginsPanelWrapperClassName(true)).toBe('');
  });

  it('returns an empty class string when no drag state applies', () => {
    expect(getPluginsPanelItemClassName(true, 1, null, null)).toBe('');
  });

  it('highlights the active drop target row', () => {
    expect(getPluginsPanelItemClassName(true, 1, 0, 1)).toBe('rounded-md ring-1 ring-primary/40');
  });

  it('dims the dragged row and skips the drop-target ring when hovering over itself', () => {
    expect(getPluginsPanelItemClassName(false, 1, 1, 1)).toBe('opacity-50 opacity-60');
  });

  it('reorders plugin statuses by drag indices', () => {
    const plugins: IPluginStatus[] = [
      {
        id: 'plugin.a',
        name: 'A',
        version: '1.0.0',
        supportedExtensions: ['.a'],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
      {
        id: 'plugin.b',
        name: 'B',
        version: '1.0.0',
        supportedExtensions: ['.b'],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ];

    expect(reorderPluginStatuses(plugins, 1, 0).map((plugin) => plugin.id)).toEqual([
      'plugin.b',
      'plugin.a',
    ]);
  });

  it('reorders plugin statuses when the first plugin moves to a later index', () => {
    const plugins: IPluginStatus[] = [
      {
        id: 'plugin.a',
        name: 'A',
        version: '1.0.0',
        supportedExtensions: ['.a'],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
      {
        id: 'plugin.b',
        name: 'B',
        version: '1.0.0',
        supportedExtensions: ['.b'],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ];

    expect(reorderPluginStatuses(plugins, 0, 1).map((plugin) => plugin.id)).toEqual([
      'plugin.b',
      'plugin.a',
    ]);
  });

  it('returns the original array when the drag indices are invalid or unchanged', () => {
    const plugins: IPluginStatus[] = [
      {
        id: 'plugin.a',
        name: 'A',
        version: '1.0.0',
        supportedExtensions: ['.a'],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
      {
        id: 'plugin.b',
        name: 'B',
        version: '1.0.0',
        supportedExtensions: ['.b'],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ];

    expect(reorderPluginStatuses(plugins, -1, 0)).toBe(plugins);
    expect(reorderPluginStatuses(plugins, 1, -1)).toBe(plugins);
    expect(reorderPluginStatuses(plugins, 2, 0)).toBe(plugins);
    expect(reorderPluginStatuses(plugins, 0, 2)).toBe(plugins);
    expect(reorderPluginStatuses(plugins, 1, 1)).toBe(plugins);
  });
});
