import { describe, expect, it } from 'vitest';
import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { createFrameGravityForce } from '../../../../src/documentRuntime/physics/frameGravity/model';
import type { ScriptShape } from '../../../../src/documentRuntime/physics/shape/model';

const frame = {
  id: 'shape:frame',
  meta: {},
  props: { h: 400, w: 600 },
  type: 'frame',
  x: 400,
  y: 200,
} satisfies ScriptShape;
const framedNode = {
  id: 'shape:framed',
  meta: { codegraphyEntityId: 'framed', codegraphyKind: 'node' },
  parentId: frame.id,
  props: { h: 120, w: 120 },
  type: 'geo',
  x: 0,
  y: 0,
} satisfies ScriptShape;
const freeNode = {
  id: 'shape:free',
  meta: { codegraphyEntityId: 'free', codegraphyKind: 'node' },
  props: { h: 120, w: 120 },
  type: 'geo',
  x: 0,
  y: 0,
} satisfies ScriptShape;

function createEngine(): GraphLayoutEngine {
  return {
    alpha: 1,
    chargeStrengthMultipliers: new Float32Array(2),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
    flags: new Uint8Array(2),
    getNodeIndex: nodeId => ['framed', 'free'].indexOf(nodeId),
    nodeIds: ['framed', 'free'],
    pause: () => undefined,
    pin: () => undefined,
    radii: new Float32Array(2),
    reheat: () => undefined,
    release: () => undefined,
    resume: () => undefined,
    setAlphaTarget: () => undefined,
    setConfig: () => undefined,
    setGraph: () => undefined,
    setKinematics: () => undefined,
    setNodePosition: () => undefined,
    settled: false,
    tick: () => ({ moving: true, settled: false, steps: 1 }),
    vx: new Float32Array(2),
    vy: new Float32Array(2),
    x: Float32Array.of(92, 0),
    y: Float32Array.of(52, 0),
  };
}

describe('tldraw frame gravity', () => {
  it('pulls only frame children toward their frame center', () => {
    const engine = createEngine();
    engine.vx[0] = -engine.x[0] * 0.1 * 0.5;
    engine.vy[0] = -engine.y[0] * 0.1 * 0.5;
    const force = createFrameGravityForce([frame, framedNode, freeNode], engine, 0.1);
    if (!force) throw new Error('Expected frame gravity force');

    force.beforeIntegration(0.5);

    expect(engine.vx[0]).toBeGreaterThan(12);
    expect(engine.vy[0]).toBeGreaterThan(7);
    expect(engine.vx[1]).toBe(0);
    expect(engine.vy[1]).toBe(0);
  });
});
