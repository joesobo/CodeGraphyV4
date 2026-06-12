import { describe, expect, it } from 'vitest';
import { createBackgroundParticlesPlugin } from '../src/plugin';

describe('createBackgroundParticlesPlugin', () => {
  it('ships a webview script for plugin-owned theme controls', () => {
    const plugin = createBackgroundParticlesPlugin();

    expect(plugin.webviewContributions).toEqual({
      scripts: ['dist/webview.js'],
    });
  });
});
