import { describe, expect, it } from 'vitest';
import {
  createQualifiedSourceId,
  resolveEdgeSourceIdentity,
} from '../../../src/graph/edgeSources/identity';

describe('core/graph/edgeSources/identity', () => {
  it('builds qualified source ids from explicit connection plugin ids only', () => {
    expect(
      createQualifiedSourceId(
        { pluginId: 'connection-plugin', sourceId: 'route' } as never,
      ),
    ).toBe('connection-plugin:route');

    expect(
      createQualifiedSourceId(
        { pluginId: undefined, sourceId: 'route' } as never,
      ),
    ).toBeUndefined();
  });

  it('returns undefined when a connection does not have a source id', () => {
    expect(
      createQualifiedSourceId(
        { pluginId: 'connection-plugin', sourceId: undefined } as never,
      ),
    ).toBeUndefined();
  });

  it('resolves plugin and source identities from explicit connection plugin ids only', () => {
    expect(
      resolveEdgeSourceIdentity(
        {
          pluginId: 'connection-plugin',
          sourceId: 'route',
        } as never,
      ),
    ).toEqual({
      pluginId: 'connection-plugin',
      qualifiedSourceId: 'connection-plugin:route',
      sourceId: 'route',
    });

    expect(
      resolveEdgeSourceIdentity(
        {
          pluginId: undefined,
          sourceId: 'route',
        } as never,
      ),
    ).toBeUndefined();
  });

  it('rejects malformed or incomplete qualified source ids', () => {
    expect(
      resolveEdgeSourceIdentity({
        pluginId: undefined,
        sourceId: undefined,
      } as never),
    ).toBeUndefined();

    expect(
      resolveEdgeSourceIdentity({
        pluginId: undefined,
        sourceId: 'missing-plugin',
      } as never),
    ).toBeUndefined();

    expect(
      resolveEdgeSourceIdentity({
        pluginId: '',
        sourceId: 'route',
      } as never),
    ).toBeUndefined();
  });
});
