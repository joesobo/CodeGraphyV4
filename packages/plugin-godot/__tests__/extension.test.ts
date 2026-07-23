import { describe, expect, it } from 'vitest';
import packageManifest from '../package.json';
import { createGodotExtensionPlugin } from '../src/extension';

describe('Godot Extension plugin', () => {
  it('uses the Extension descriptor identity', () => {
    expect(createGodotExtensionPlugin()).toMatchObject({
      id: 'codegraphy.godot.extension',
      name: 'Godot Graph View',
      apiVersion: '^1.0.0',
    });
  });

  it('owns Godot file, symbol, and edge presentation in its Extension descriptor', () => {
    const descriptor = packageManifest.codegraphy.plugins.find(
      plugin => plugin.host === 'codegraphy.extension',
    );

    expect(descriptor?.data.legendEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'plugin:codegraphy.godot:file:script',
        pattern: '*.gd',
        imagePath: 'assets/godot.svg',
      }),
      expect.objectContaining({
        id: 'plugin:codegraphy.gdscript:symbol:signal',
        match: expect.objectContaining({
          symbolPluginKind: 'signal',
          symbolSource: 'codegraphy.gdscript',
        }),
      }),
      expect.objectContaining({
        id: 'plugin:codegraphy.gdscript:edge:signal-connection',
        pattern: 'codegraphy.gdscript:signal-connection',
        target: 'edge',
      }),
    ]));
  });
});
