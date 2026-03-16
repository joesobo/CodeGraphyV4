import { describe, it, expect } from 'vitest';
import {
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
  resolvePluginModuleActivator,
} from '../../src/webview/pluginMessageParser';

describe('pluginMessageParser', () => {
  describe('normalizePluginInjectPayload', () => {
    it('normalizes valid plugin inject payloads', () => {
      expect(normalizePluginInjectPayload({
        pluginId: 'acme.plugin',
        scripts: ['a.js'],
        styles: ['a.css'],
      })).toEqual({
        pluginId: 'acme.plugin',
        scripts: ['a.js'],
        styles: ['a.css'],
      });
    });

    it('normalizes invalid script and style lists to empty arrays', () => {
      expect(normalizePluginInjectPayload({
        pluginId: 'acme.plugin',
        scripts: 'a.js',
        styles: 'a.css',
      })).toEqual({
        pluginId: 'acme.plugin',
        scripts: [],
        styles: [],
      });
    });

    it('rejects payloads without a string plugin id', () => {
      expect(normalizePluginInjectPayload({ pluginId: 1 })).toBeNull();
    });

    it('rejects null payload', () => {
      expect(normalizePluginInjectPayload(null)).toBeNull();
    });
  });

  describe('parsePluginScopedMessage', () => {
    it('parses scoped plugin messages with nested event names', () => {
      expect(parsePluginScopedMessage('plugin:acme.plugin:node:click', { nodeId: 'src/App.ts' })).toEqual({
        pluginId: 'acme.plugin',
        message: { type: 'node:click', data: { nodeId: 'src/App.ts' } },
      });
    });

    it('rejects plugin messages without an event name', () => {
      expect(parsePluginScopedMessage('plugin:acme.plugin', null)).toBeNull();
    });

    it('rejects non-plugin message types', () => {
      expect(parsePluginScopedMessage('GRAPH_DATA_UPDATED', null)).toBeNull();
    });
  });

  describe('resolvePluginModuleActivator', () => {
    it('resolves top-level activate exports', () => {
      const activate = () => undefined;
      expect(resolvePluginModuleActivator({ activate })).toBe(activate);
    });

    it('resolves default function exports', () => {
      const activate = () => undefined;
      expect(resolvePluginModuleActivator({ default: activate })).toBe(activate);
    });

    it('resolves default object activate exports', () => {
      const activate = () => undefined;
      expect(resolvePluginModuleActivator({ default: { activate } })).toBe(activate);
    });

    it('returns undefined when a plugin module has no activator', () => {
      expect(resolvePluginModuleActivator({ default: {} })).toBeUndefined();
    });
  });
});
