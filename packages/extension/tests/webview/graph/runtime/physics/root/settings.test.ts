import { describe, expect, it } from 'vitest';
import { DEFAULT_PHYSICS_SETTINGS } from '../../../../../../src/shared/settings/physics';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { ownedNodeCollisionRadius } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/collisionRadius';
import {
  applyOwnedPhysicsSettings,
  toOwnedPhysicsConfig,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import {
  createGraphLayoutEngine,
  DEFAULT_GRAPH_LAYOUT_CONFIG,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

function engine() {
  return createGraphLayoutEngine({
    nodeIds: ['a'],
    initialX: Float32Array.of(20),
    initialY: Float32Array.of(0),
    radii: Float32Array.of(4),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  }, { centralGravity: 0, chargeStrength: 0 });
}

describe('owned physics settings', () => {
  it('maps every persisted force setting into the typed engine', () => {
    expect(toOwnedPhysicsConfig(DEFAULT_PHYSICS_SETTINGS)).toEqual({
      centralGravity: 0.1,
      chargeStrength: -250,
      linkDistance: 80,
      linkStrength: 1,
      velocityDecay: 0.4,
    });
  });

  it.each([
    ['repelForce', { repelForce: 20 }, 'chargeStrength', -500],
    ['centerForce', { centerForce: 0.5 }, 'centralGravity', 0.5],
    ['linkDistance', { linkDistance: 120 }, 'linkDistance', 120],
    ['linkForce', { linkForce: 0.4 }, 'linkStrength', 0.4],
    ['damping', { damping: 0.2 }, 'velocityDecay', 0.2],
  ] as const)('maps changed %s values', (_field, patch, mappedField, expected) => {
    expect(toOwnedPhysicsConfig({ ...DEFAULT_PHYSICS_SETTINGS, ...patch })[mappedField]).toBe(expected);
  });

  it('reheats typed physics when settings are applied', () => {
    const layout = engine();
    for (let tick = 0; tick < 320; tick += 1) layout.tick();
    expect(layout.settled).toBe(true);

    applyOwnedPhysicsSettings(layout, { ...DEFAULT_PHYSICS_SETTINGS, centerForce: 1 });

    expect(layout.settled).toBe(false);
  });

  it('maps persisted damping to D3 velocity decay', () => {
    expect(toOwnedPhysicsConfig({ ...DEFAULT_PHYSICS_SETTINGS, damping: 0.7 }).velocityDecay)
      .toBe(0.7);
  });

  it('scales charge for plugin-owned graph physics overrides', () => {
    const layout = createGraphLayoutEngine({
      nodeIds: ['disabled', 'normal'],
      initialX: Float32Array.of(0, 20),
      initialY: Float32Array.of(0, 0),
      chargeStrengthMultipliers: Float32Array.of(0, 1),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, { centralGravity: 0, collisionIterations: 0, velocityDecay: 0 });
    layout.tick();
    expect(layout.vx[0]).toBeLessThan(0);
    expect(layout.vx[1]).toBe(0);
  });

  it('ships collision constraints as part of the owned engine defaults', () => {
    expect(DEFAULT_GRAPH_LAYOUT_CONFIG.collisionIterations).toBeGreaterThan(0);
    expect(DEFAULT_GRAPH_LAYOUT_CONFIG.collisionStrength).toBe(1);
  });

  it('uses node size plus production padding for the collision radius', () => {
    expect(ownedNodeCollisionRadius({ size: 9 } as FGNode)).toBe(13);
  });

  it('uses sized rectangle bounds for the collision radius', () => {
    expect(ownedNodeCollisionRadius({
      size: 9,
      shapeSize2D: { height: 80, width: 120 },
    } as FGNode)).toBeCloseTo(76.11102550927978);
  });

  it('uses explicit plugin collision radius overrides before visual rectangle bounds', () => {
    expect(ownedNodeCollisionRadius({
      collisionRadius2D: 0,
      size: 9,
      shapeSize2D: { height: 80, width: 120 },
    } as FGNode)).toBe(4);
  });
});
