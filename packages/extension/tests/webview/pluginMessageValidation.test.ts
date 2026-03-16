import { describe, it, expect } from 'vitest';
import {
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
} from '../../src/webview/pluginMessageValidation';

describe('normalizePluginInjectPayload', () => {
  it('normalizes a fully valid payload', () => {
    expect(normalizePluginInjectPayload({
      pluginId: 'acme',
      scripts: ['a.js', 'b.js'],
      styles: ['a.css'],
    })).toEqual({
      pluginId: 'acme',
      scripts: ['a.js', 'b.js'],
      styles: ['a.css'],
    });
  });

  it('returns null for null input', () => {
    expect(normalizePluginInjectPayload(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizePluginInjectPayload(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(normalizePluginInjectPayload('string')).toBeNull();
    expect(normalizePluginInjectPayload(42)).toBeNull();
    expect(normalizePluginInjectPayload(true)).toBeNull();
  });

  it('returns null when pluginId is missing', () => {
    expect(normalizePluginInjectPayload({ scripts: ['a.js'] })).toBeNull();
  });

  it('returns null when pluginId is not a string', () => {
    expect(normalizePluginInjectPayload({ pluginId: 123 })).toBeNull();
    expect(normalizePluginInjectPayload({ pluginId: null })).toBeNull();
    expect(normalizePluginInjectPayload({ pluginId: undefined })).toBeNull();
    expect(normalizePluginInjectPayload({ pluginId: true })).toBeNull();
  });

  it('defaults scripts to empty array when not an array', () => {
    const result = normalizePluginInjectPayload({
      pluginId: 'acme',
      scripts: 'not-array',
      styles: [],
    });
    expect(result?.scripts).toEqual([]);
  });

  it('defaults styles to empty array when not an array', () => {
    const result = normalizePluginInjectPayload({
      pluginId: 'acme',
      scripts: [],
      styles: 'not-array',
    });
    expect(result?.styles).toEqual([]);
  });

  it('defaults scripts to empty array when missing', () => {
    const result = normalizePluginInjectPayload({
      pluginId: 'acme',
      styles: ['a.css'],
    });
    expect(result?.scripts).toEqual([]);
  });

  it('defaults styles to empty array when missing', () => {
    const result = normalizePluginInjectPayload({
      pluginId: 'acme',
      scripts: ['a.js'],
    });
    expect(result?.styles).toEqual([]);
  });

  it('filters out non-string elements from scripts array', () => {
    const result = normalizePluginInjectPayload({
      pluginId: 'acme',
      scripts: ['a.js', 42, null, 'b.js', true],
      styles: [],
    });
    expect(result?.scripts).toEqual(['a.js', 'b.js']);
  });

  it('filters out non-string elements from styles array', () => {
    const result = normalizePluginInjectPayload({
      pluginId: 'acme',
      scripts: [],
      styles: ['a.css', 42, null, 'b.css', undefined],
    });
    expect(result?.styles).toEqual(['a.css', 'b.css']);
  });
});

describe('parsePluginScopedMessage', () => {
  it('parses a simple plugin-scoped message', () => {
    expect(parsePluginScopedMessage('plugin:acme:click', { x: 1 })).toEqual({
      pluginId: 'acme',
      message: { type: 'click', data: { x: 1 } },
    });
  });

  it('parses messages with nested colon-separated event names', () => {
    expect(parsePluginScopedMessage('plugin:acme:node:click:deep', 'payload')).toEqual({
      pluginId: 'acme',
      message: { type: 'node:click:deep', data: 'payload' },
    });
  });

  it('returns null for non-plugin prefixed types', () => {
    expect(parsePluginScopedMessage('GRAPH_DATA_UPDATED', null)).toBeNull();
  });

  it('returns null when there is no event name after the plugin id', () => {
    expect(parsePluginScopedMessage('plugin:acme', null)).toBeNull();
  });

  it('returns null when there is only the prefix with no plugin id', () => {
    // 'plugin:' split gives ['plugin', ''] — empty pluginId
    expect(parsePluginScopedMessage('plugin:', null)).toBeNull();
  });

  it('handles null data in the message', () => {
    const result = parsePluginScopedMessage('plugin:acme:event', null);
    expect(result).toEqual({
      pluginId: 'acme',
      message: { type: 'event', data: null },
    });
  });

  it('handles undefined data in the message', () => {
    const result = parsePluginScopedMessage('plugin:acme:event', undefined);
    expect(result).toEqual({
      pluginId: 'acme',
      message: { type: 'event', data: undefined },
    });
  });
});
