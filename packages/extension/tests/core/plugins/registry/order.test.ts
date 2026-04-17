import { describe, expect, it } from 'vitest';
import { buildReorderedPluginMap, replacePluginMap } from '../../../../src/core/plugins/registry/runtime/order';

describe('core/plugins/registry/runtime/order', () => {
  it('reorders plugins once and appends unmentioned plugins without duplicates', () => {
    const alpha = { plugin: { id: 'alpha' } } as never;
    const beta = { plugin: { id: 'beta' } } as never;
    const gamma = { plugin: { id: 'gamma' } } as never;
    const plugins = new Map([
      ['alpha', alpha],
      ['beta', beta],
      ['gamma', gamma],
    ]);

    const reordered = buildReorderedPluginMap(plugins, ['beta', 'missing', 'beta']);

    expect([...reordered.entries()]).toEqual([
      ['beta', beta],
      ['alpha', alpha],
      ['gamma', gamma],
    ]);
  });

  it('replaces the plugin map with the reordered entry iteration', () => {
    const alpha = { plugin: { id: 'alpha' } } as never;
    const beta = { plugin: { id: 'beta' } } as never;
    const plugins = new Map([
      ['alpha', alpha],
      ['beta', beta],
    ]);
    const reordered = new Map([
      ['beta', beta],
      ['alpha', alpha],
    ]);

    replacePluginMap(plugins, reordered);

    expect([...plugins.entries()]).toEqual([
      ['beta', beta],
      ['alpha', alpha],
    ]);
  });
});
