import { describe, expect, it } from 'vitest';

import {
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
} from '../../../src/webview/pluginRuntime/messageValidation';

describe('normalizePluginInjectPayload', () => {
  it('returns null for nullish payloads', () => {
    expect(normalizePluginInjectPayload(null)).toBeNull();
    expect(normalizePluginInjectPayload(undefined)).toBeNull();
  });

  it('returns null for non-object payloads', () => {
    expect(normalizePluginInjectPayload('plugin')).toBeNull();
    expect(normalizePluginInjectPayload(42)).toBeNull();
  });

  it('returns null when pluginId is missing', () => {
    expect(normalizePluginInjectPayload({ scripts: [], styles: [] })).toBeNull();
  });

  it('returns null when pluginId is not a string', () => {
    expect(normalizePluginInjectPayload({ pluginId: 7, scripts: [], styles: [] })).toBeNull();
  });

  it('keeps only string script and style entries', () => {
    expect(normalizePluginInjectPayload({
      pluginId: 'plugin.test',
      scripts: ['a.js', 3, 'b.js'],
      styles: ['a.css', false, 'b.css'],
    })).toEqual({
      pluginId: 'plugin.test',
      scripts: ['a.js', 'b.js'],
      styles: ['a.css', 'b.css'],
    });
  });

  it('defaults scripts and styles to empty arrays when they are not arrays', () => {
    expect(normalizePluginInjectPayload({
      pluginId: 'plugin.test',
      scripts: 'a.js',
      styles: { href: 'a.css' },
    })).toEqual({
      pluginId: 'plugin.test',
      scripts: [],
      styles: [],
    });
  });
});

describe('parsePluginScopedMessage', () => {
  it('returns null for non-plugin message types', () => {
    expect(parsePluginScopedMessage('GRAPH_DATA_UPDATED', {})).toBeNull();
  });

  it('returns null when the plugin id segment is missing', () => {
    expect(parsePluginScopedMessage('plugin::PING', {})).toBeNull();
  });

  it('returns null when the nested message type segment is missing', () => {
    expect(parsePluginScopedMessage('plugin:plugin.test', {})).toBeNull();
  });

  it('parses plugin-scoped messages with a single type segment', () => {
    expect(parsePluginScopedMessage('plugin:plugin.test:PING', { ok: true })).toEqual({
      pluginId: 'plugin.test',
      message: { type: 'PING', data: { ok: true } },
    });
  });

  it('preserves nested plugin message type segments', () => {
    expect(parsePluginScopedMessage('plugin:plugin.test:GRAPH:UPDATE', { ok: true })).toEqual({
      pluginId: 'plugin.test',
      message: { type: 'GRAPH:UPDATE', data: { ok: true } },
    });
  });
});
