import { describe, expect, it } from 'vitest';
import {
  getPluginStatusLabel,
  getPluginsPanelItemClassName,
  getPluginsPanelWrapperClassName,
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
    expect(getPluginsPanelItemClassName(true)).toBe('');
  });

  it('uses only the enabled state for plugin row classes', () => {
    expect(getPluginsPanelItemClassName(false)).toBe('opacity-50');
  });

  it('labels unavailable plugin runtimes unless transient labels are suppressed', () => {
    const plugin: IPluginStatus = {
      id: 'plugin.test',
      name: 'Test Plugin',
      version: '1.0.0',
      supportedExtensions: [],
      status: 'unavailable',
      enabled: true,
      connectionCount: 0,
    };

    expect(getPluginStatusLabel(plugin)).toBe('Runtime unavailable');
    expect(getPluginStatusLabel(plugin, { suppressUnavailable: true })).toBeUndefined();
  });
});
