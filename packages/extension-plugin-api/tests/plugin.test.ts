import { describe, expectTypeOf, it } from 'vitest';
import type { IExtensionPlugin } from '../src';

describe('Extension Plugin API', () => {
  it('does not require Core analysis fields', () => {
    const plugin = {
      id: 'acme.particles',
      name: 'Particles',
      version: '1.0.0',
      apiVersion: '^1.0.0',
      webviewContributions: { scripts: ['./dist/webview.js'] },
    } satisfies IExtensionPlugin;

    expectTypeOf(plugin).toMatchTypeOf<IExtensionPlugin>();
  });
});
