import { describe, expect, it } from 'vitest';
import { createOwnedDagTargets } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/dag';

describe('owned 2d DAG targets', () => {
  it('assigns deterministic top-down and left-right depth constraints', () => {
    const topDown = createOwnedDagTargets(4, [0, 1, 0], [1, 2, 3], 'td', 60);
    const leftRight = createOwnedDagTargets(4, [0, 1, 0], [1, 2, 3], 'lr', 40);

    expect([...topDown!.targetY]).toEqual([0, 60, 120, 60]);
    expect([...topDown!.targetX].every(Number.isNaN)).toBe(true);
    expect([...leftRight!.targetX]).toEqual([0, 40, 80, 40]);
    expect([...leftRight!.targetY].every(Number.isNaN)).toBe(true);
  });

  it('places radial levels on finite deterministic rings and tolerates cycles', () => {
    const first = createOwnedDagTargets(4, [0, 1, 2], [1, 2, 0], 'radialout', 30)!;
    const second = createOwnedDagTargets(4, [0, 1, 2], [1, 2, 0], 'radialout', 30)!;

    expect([...first.targetX, ...first.targetY].every(Number.isFinite)).toBe(true);
    expect([...first.targetX]).toEqual([...second.targetX]);
    expect([...first.targetY]).toEqual([...second.targetY]);
  });
});
