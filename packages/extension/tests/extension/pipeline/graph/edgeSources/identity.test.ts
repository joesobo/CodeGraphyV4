import { describe, expect, it } from 'vitest';
import {
  createQualifiedSourceId,
  resolveEdgeSourceIdentity,
} from '../../../../../src/extension/pipeline/graph/edgeSources/identity';

describe('pipeline/graph/edgeSources/identity', () => {
  it('builds qualified source ids from the connection plugin id or plugin fallback', () => {
    expect(
      createQualifiedSourceId(
        { id: 'fallback-plugin' } as never,
        { pluginId: 'connection-plugin', sourceId: 'route' } as never,
      ),
    ).toBe('connection-plugin:route');

    expect(
      createQualifiedSourceId(
        { id: 'fallback-plugin' } as never,
        { pluginId: undefined, sourceId: 'route' } as never,
      ),
    ).toBe('fallback-plugin:route');
  });

  it('returns undefined when a connection does not have a source id', () => {
    expect(
      createQualifiedSourceId(
        { id: 'fallback-plugin' } as never,
        { pluginId: 'connection-plugin', sourceId: undefined } as never,
      ),
    ).toBeUndefined();
  });

  it('resolves plugin and source identities from explicit and fallback values', () => {
    expect(
      resolveEdgeSourceIdentity(
        { id: 'fallback-plugin' } as never,
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
        { id: 'fallback-plugin' } as never,
        {
          pluginId: undefined,
          sourceId: 'route',
        } as never,
      ),
    ).toEqual({
      pluginId: 'fallback-plugin',
      qualifiedSourceId: 'fallback-plugin:route',
      sourceId: 'route',
    });
  });

  it('rejects malformed or incomplete qualified source ids', () => {
    expect(
      resolveEdgeSourceIdentity(undefined, {
        pluginId: undefined,
        sourceId: undefined,
      } as never),
    ).toBeUndefined();

    expect(
      resolveEdgeSourceIdentity(undefined, {
        pluginId: undefined,
        sourceId: 'missing-plugin',
      } as never),
    ).toBeUndefined();

    expect(
      resolveEdgeSourceIdentity(undefined, {
        pluginId: '',
        sourceId: 'route',
      } as never),
    ).toBeUndefined();
  });
});
