import { describe, expect, it } from 'vitest';
import { collectChangedKeys } from '../../../../../src/extension/repoSettings/store/model/changedKeys';

describe('extension/repoSettings/store/model/changedKeys', () => {
  it('returns the repo root key when primitive values change at the top level', () => {
    expect(collectChangedKeys('old', 'new')).toEqual(['codegraphy']);
  });

  it('returns the repo root key when the top level changes between an object and a primitive', () => {
    expect(collectChangedKeys({ filters: { maxFiles: 200 } }, 'new')).toEqual([
      'codegraphy',
    ]);
    expect(collectChangedKeys('old', { filters: { maxFiles: 500 } })).toEqual([
      'codegraphy',
    ]);
  });

  it('returns the current nested path when a non-object leaf changes', () => {
    expect(
      collectChangedKeys(
        { filters: { maxFiles: 200 } },
        { filters: { maxFiles: 500 } },
      ),
    ).toEqual(['filters.maxFiles']);
  });

  it('collects changed keys from both previous and next object shapes', () => {
    expect(
      collectChangedKeys(
        { graph: { depthLimit: 2, showLabels: true } },
        { graph: { showLabels: true, directionMode: 'particles' } },
      ).sort(),
    ).toEqual(['graph.depthLimit', 'graph.directionMode']);
  });

  it('returns the nested path when one side changes between an object and a primitive', () => {
    expect(
      collectChangedKeys(
        { graph: { filters: { includeGenerated: true } } },
        { graph: { filters: false } },
      ),
    ).toEqual(['graph.filters']);

    expect(
      collectChangedKeys(
        { graph: { filters: false } },
        { graph: { filters: { includeGenerated: true } } },
      ),
    ).toEqual(['graph.filters']);
  });

  it('returns an empty list when nested values are unchanged', () => {
    expect(
      collectChangedKeys(
        { graph: { colors: { folder: '#123456' } } },
        { graph: { colors: { folder: '#123456' } } },
      ),
    ).toEqual([]);
  });
});
