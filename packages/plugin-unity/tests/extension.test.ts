import { describe, expect, it } from 'vitest';
import packageManifest from '../package.json';
import { createUnityExtensionPlugin } from '../src/extension';

describe('Unity Extension plugin', () => {
  it('uses the Extension descriptor identity', () => {
    expect(createUnityExtensionPlugin()).toMatchObject({
      id: 'codegraphy.unity.extension',
      name: 'Unity Graph View',
      apiVersion: '^1.0.0',
    });
  });

  it('owns Unity file and symbol presentation in its Extension descriptor', () => {
    const descriptor = packageManifest.codegraphy.plugins.find(
      plugin => plugin.host === 'codegraphy.extension',
    );

    expect(descriptor?.data.legendEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'plugin:codegraphy.unity:file:scene',
        pattern: '*.unity',
        imagePath: 'assets/unity.svg',
      }),
      expect.objectContaining({
        id: 'plugin:codegraphy.unity:symbol:game-object',
        match: expect.objectContaining({
          symbolPluginKind: 'game-object',
          symbolSource: 'codegraphy.unity',
        }),
      }),
      expect.objectContaining({
        id: 'plugin:codegraphy.unity:symbol:component',
        match: expect.objectContaining({
          symbolPluginKind: 'component',
          symbolSource: 'codegraphy.unity',
        }),
      }),
    ]));
  });
});
