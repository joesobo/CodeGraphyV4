import { describe, expect, it } from 'vitest';
import { createParticlesPlugin } from '../src/plugin';

describe('createParticlesPlugin', () => {
  it('ships a webview script for plugin-owned theme controls', () => {
    const plugin = createParticlesPlugin();

    expect(plugin.webviewContributions).toEqual({
      scripts: ['dist/webview.js'],
    });
  });
});
