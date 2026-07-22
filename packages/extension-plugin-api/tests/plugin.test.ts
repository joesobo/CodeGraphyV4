import { describe, expectTypeOf, it } from 'vitest';
import type { IExtensionPlugin } from '../src';
import type { IGraphNode } from '@codegraphy-dev/plugin-api';

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

  it('receives semantic graph nodes without Core-owned visual fields', () => {
    expectTypeOf<IGraphNode>().not.toHaveProperty('color');
    expectTypeOf<IGraphNode>().not.toHaveProperty('x');
    expectTypeOf<IGraphNode>().not.toHaveProperty('shape2D');
    expectTypeOf<IGraphNode>().not.toHaveProperty('favorite');
  });
});
