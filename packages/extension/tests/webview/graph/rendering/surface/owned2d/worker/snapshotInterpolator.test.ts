import { describe, expect, it } from 'vitest';
import { GraphNodeFlag } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import { GraphLayoutSnapshotInterpolator } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/snapshotInterpolator';

describe('graph layout snapshot interpolation', () => {
  it('interpolates between snapshots until the arrival interval completes', () => {
    const interpolator = new GraphLayoutSnapshotInterpolator(
      Float32Array.of(0),
      Float32Array.of(0),
      0,
    );
    interpolator.accept(Float32Array.of(10), Float32Array.of(0), 100);
    interpolator.sample(1000 / 60 + 100, new Uint8Array(1), false);
    interpolator.accept(Float32Array.of(30), Float32Array.of(0), 200);

    const halfway = interpolator.sample(250, new Uint8Array(1), false);
    const halfwayX = halfway.x[0];
    const complete = interpolator.sample(300, new Uint8Array(1), false);

    expect(halfwayX).toBe(20);
    expect(halfway.needsFrame).toBe(true);
    expect(complete.x[0]).toBe(30);
    expect(complete.needsFrame).toBe(false);
  });

  it('renders pinned nodes authoritatively and resets across topology changes', () => {
    const interpolator = new GraphLayoutSnapshotInterpolator(
      Float32Array.of(0),
      Float32Array.of(0),
      0,
    );
    interpolator.accept(Float32Array.of(10), Float32Array.of(20), 100);

    const pinned = interpolator.sample(
      100,
      Uint8Array.of(GraphNodeFlag.Pinned),
      false,
    );
    expect([pinned.x[0], pinned.y[0]]).toEqual([10, 20]);

    interpolator.reset(Float32Array.of(4, 5), Float32Array.of(6, 7), 200);
    const reset = interpolator.sample(200, new Uint8Array(2), false);
    expect(Array.from(reset.x)).toEqual([4, 5]);
    expect(Array.from(reset.y)).toEqual([6, 7]);
    expect(reset.needsFrame).toBe(false);
  });

  it('keeps unrelated nodes continuous when one node moves directly during interpolation', () => {
    const currentX = Float32Array.of(0, 100);
    const currentY = Float32Array.of(0, 0);
    const interpolator = new GraphLayoutSnapshotInterpolator(currentX, currentY, 0);
    const firstX = Float32Array.of(10, 110);
    const firstY = Float32Array.of(0, 0);
    interpolator.accept(firstX, firstY, 100);
    const halfway = interpolator.sample(1000 / 120 + 100, new Uint8Array(2), false);
    expect(halfway.x[1]).toBe(105);

    firstX[0] = 50;
    interpolator.directPosition(0, 50, 0);
    interpolator.accept(Float32Array.of(20, 120), Float32Array.of(0, 0), 110);
    const next = interpolator.sample(110, new Uint8Array(2), false);

    expect(next.x[0]).toBe(50);
    expect(next.x[1]).toBe(105);
  });
});
