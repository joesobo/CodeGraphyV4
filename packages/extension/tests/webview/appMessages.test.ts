import { describe, expect, it } from 'vitest';
import {
  getNoDataHint,
  normalizePluginInjectPayload,
  parsePluginScopedMessage,
  resolvePluginModuleActivator,
} from '../../src/webview/appMessages';

describe('appMessages', () => {
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

  it('rejects plugin inject payloads without a string plugin id', () => {
    expect(normalizePluginInjectPayload({ pluginId: 1 })).toBeNull();
    expect(normalizePluginInjectPayload(null)).toBeNull();
  });

  it('parses scoped plugin messages with nested event names', () => {
    expect(parsePluginScopedMessage('plugin:acme.plugin:node:click', { nodeId: 'src/App.ts' })).toEqual({
      pluginId: 'acme.plugin',
      message: { type: 'node:click', data: { nodeId: 'src/App.ts' } },
    });
  });

  it('rejects plugin messages without an event name', () => {
    expect(parsePluginScopedMessage('plugin:acme.plugin', null)).toBeNull();
    expect(parsePluginScopedMessage('GRAPH_DATA_UPDATED', null)).toBeNull();
  });

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

  it('returns the hidden-files hint when graph data exists and orphans are disabled', () => {
    expect(getNoDataHint({ nodes: [], edges: [] }, false)).toMatch(/All files are hidden/);
  });

  it('returns the open-folder hint otherwise', () => {
    expect(getNoDataHint(null, true)).toBe('Open a folder to visualize its structure.');
  });

  it('returns the open-folder hint when graphData is null and showOrphans is false', () => {
    expect(getNoDataHint(null, false)).toBe('Open a folder to visualize its structure.');
  });

  it('returns the open-folder hint when graphData exists and showOrphans is true', () => {
    expect(getNoDataHint({ nodes: [], edges: [] }, true)).toBe('Open a folder to visualize its structure.');
  });

  it('returns the hidden-files hint only when graphData is truthy AND showOrphans is false', () => {
    const hidden = getNoDataHint({ nodes: [], edges: [] }, false);
    const open1 = getNoDataHint(null, false);
    const open2 = getNoDataHint(null, true);
    const open3 = getNoDataHint({ nodes: [], edges: [] }, true);

    expect(hidden).toMatch(/All files are hidden/);
    expect(open1).toBe('Open a folder to visualize its structure.');
    expect(open2).toBe('Open a folder to visualize its structure.');
    expect(open3).toBe('Open a folder to visualize its structure.');
  });
});
