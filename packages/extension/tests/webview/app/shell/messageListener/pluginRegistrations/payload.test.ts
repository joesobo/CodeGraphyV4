import { describe, expect, it } from 'vitest';
import { getPluginStatusEntries } from '../../../../../../src/webview/app/shell/messageListener/pluginRegistrations/payload';

describe('app/shell/messageListener/pluginRegistrations/payload', () => {
  it('returns null for messages outside plugin status updates', () => {
    expect(getPluginStatusEntries({ type: 'GRAPH_DATA_UPDATED', payload: { plugins: [] } })).toBeNull();
  });

  it('returns null for missing or non-object payloads', () => {
    expect(getPluginStatusEntries({ type: 'PLUGINS_UPDATED' })).toBeNull();
    expect(getPluginStatusEntries({ type: 'PLUGINS_UPDATED', payload: null })).toBeNull();
    expect(getPluginStatusEntries({ type: 'PLUGINS_UPDATED', payload: 'bad' })).toBeNull();
  });

  it('returns null when plugins is not an array', () => {
    expect(getPluginStatusEntries({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: 'bad' },
    })).toBeNull();
  });

  it('returns plugin entries from plugin status payloads', () => {
    const plugins = [{ id: 'plugin' }];

    expect(getPluginStatusEntries({
      type: 'PLUGINS_UPDATED',
      payload: { plugins },
    })).toBe(plugins);
  });
});
