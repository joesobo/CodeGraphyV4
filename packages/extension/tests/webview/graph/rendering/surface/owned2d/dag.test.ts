import { describe, expect, it } from 'vitest';
import { createOwnedDagTargets } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/dag';

describe('owned 2d DAG targets', () => {
  it('assigns deterministic top-down and left-right depth constraints', () => {
    const topDown = createOwnedDagTargets(4, [0, 1, 0], [1, 2, 3], 'td', 60);
    const leftRight = createOwnedDagTargets(4, [0, 1, 0], [1, 2, 3], 'lr', 40);

    expect([...topDown!.targetY]).toEqual([-60, 0, 60, 0]);
    expect([...topDown!.targetX].every(Number.isNaN)).toBe(true);
    expect([...topDown!.targetRadius].every(Number.isNaN)).toBe(true);
    expect([...leftRight!.targetX]).toEqual([-40, 0, 40, 0]);
    expect([...leftRight!.targetY].every(Number.isNaN)).toBe(true);
    expect([...leftRight!.targetRadius].every(Number.isNaN)).toBe(true);
  });

  it('uses D3 radial levels without prescribing node angles and tolerates cycles', () => {
    const first = createOwnedDagTargets(4, [0, 1, 2], [1, 2, 0], 'radialout', 30)!;
    const second = createOwnedDagTargets(4, [0, 1, 2], [1, 2, 0], 'radialout', 30)!;

    expect([...first.targetX, ...first.targetY].every(Number.isNaN)).toBe(true);
    expect([...first.targetRadius]).toEqual([...second.targetRadius]);
    expect(first.targetRadius[0]).toBe(0);
    expect([...first.targetRadius].every(Number.isFinite)).toBe(true);
  });
});
