import { describe, expect, it } from 'vitest';

import { createSyntheticFixture } from '../../src/fixture/presets';
import {
  resolveGraphBenchmarkDriver,
  selectSyntheticDragTarget,
  selectSyntheticDragTargetDetails,
} from '../../src/harness/driver';

describe('resolveGraphBenchmarkDriver', () => {
  it('selects the current renderer driver explicitly', () => {
    expect(resolveGraphBenchmarkDriver('current').renderer).toBe('current');
  });

  it('selects the highest-degree hub and its stable one-hop neighbors', () => {
    const fixture = createSyntheticFixture('tiny', 307);
    const selection = selectSyntheticDragTargetDetails(fixture);

    expect(selection.targetNodeId).toBe('tiny/hub.ts');
    expect(selection.neighborNodeIds).toEqual([
      'tiny/leaf-0.ts',
      'tiny/leaf-1.ts',
      'tiny/leaf-2.ts',
      'tiny/leaf-3.ts',
      'tiny/leaf-4.ts',
      'tiny/leaf-5.ts',
      'tiny/leaf-6.ts',
      'tiny/leaf-7.ts',
    ]);
    expect(selectSyntheticDragTarget(fixture)).toBe(selection.targetNodeId);
    expect(selectSyntheticDragTargetDetails(createSyntheticFixture('tiny', 307)))
      .toEqual(selection);
  });

  it('selects the owned WebGPU renderer driver explicitly', () => {
    expect(resolveGraphBenchmarkDriver('webgpu').renderer).toBe('webgpu');
  });
});
