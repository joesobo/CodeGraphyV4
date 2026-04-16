import { describe, expect, it } from 'vitest';
import { collectChangedKeys } from '../../../src/extension/repoSettings/storeDiff';

describe('extension/repoSettings/storeDiff', () => {
  it('returns the repo root key when primitive values change at the top level', () => {
    expect(collectChangedKeys('old', 'new')).toEqual(['codegraphy']);
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

  it('returns an empty list when nested values are unchanged', () => {
    expect(
      collectChangedKeys(
        { graph: { colors: { folder: '#123456' } } },
        { graph: { colors: { folder: '#123456' } } },
      ),
    ).toEqual([]);
  });
});
