import { describe, expect, it } from 'vitest';

import { createSyntheticFixture } from '../../src/fixture/presets';
import {
  resolveGraphBenchmarkDriver,
  selectSyntheticDragTarget,
} from '../../src/harness/driver';

describe('resolveGraphBenchmarkDriver', () => {
  it('selects the current renderer driver explicitly', () => {
    expect(resolveGraphBenchmarkDriver('current').renderer).toBe('current');
  });

  it('selects the last connected fixture node independent of layout', () => {
    const fixture = createSyntheticFixture('1k', 307);
    const target = selectSyntheticDragTarget(fixture);
    const connectedIds = new Set(fixture.graph.edges.flatMap(edge => [edge.from, edge.to]));
    const expectedTarget = [...fixture.graph.nodes]
      .reverse()
      .find(node => connectedIds.has(node.id));

    expect(target).toBe(expectedTarget?.id);
    expect(selectSyntheticDragTarget(createSyntheticFixture('1k', 307))).toBe(target);
  });

  it('fails before setup when a renderer driver is unavailable', () => {
    expect(() => resolveGraphBenchmarkDriver('webgpu')).toThrow(
      'Renderer is not available yet: webgpu',
    );
  });
});
