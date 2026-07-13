import { describe, expect, it, vi } from 'vitest';
import {
  createEngine,
  outputBuffers,
  publishTick,
  tickCommands,
} from './hostFixture';

describe('worker-hosted graph layout lifecycle', () => {
  it('cycles two transferable output sets without allocating per tick', () => {
    const { engine, worker } = createEngine();
    const [first, second] = outputBuffers(worker);

    engine.tick();
    expect(tickCommands(worker)[0].recycledBuffers).toBeUndefined();
    publishTick(worker, first);
    expect(tickCommands(worker)).toHaveLength(1);

    engine.tick();
    expect(tickCommands(worker)[1].recycledBuffers).toBeUndefined();
    publishTick(worker, second);

    engine.tick();
    expect(tickCommands(worker)[2].recycledBuffers).toEqual([first]);
  });

  it('publishes neighbor motion from an in-flight tick without moving a directly dragged node', () => {
    const onUpdate = vi.fn();
    const { engine, worker } = createEngine(onUpdate, onUpdate, {
      nodeIds: ['dragged', 'neighbor'],
      initialX: Float32Array.of(0, 10),
      initialY: Float32Array.of(0, 10),
      radii: Float32Array.of(4, 4),
      edgeSources: Uint32Array.of(0),
      edgeTargets: Uint32Array.of(1),
    });
    const [first] = outputBuffers(worker);

    engine.tick();
    engine.pin(0);
    engine.setAlphaTarget(0.3);
    engine.setNodePosition(0, 25, 30);
    engine.release(0);
    engine.setAlphaTarget(0);
    new Float32Array(first.x).set([5, 15]);
    new Float32Array(first.y).set([6, 16]);
    publishTick(worker, first, {
      result: { moving: false, settled: true, steps: 1 },
    });

    expect(Array.from(engine.x)).toEqual([25, 15]);
    expect(Array.from(engine.y)).toEqual([30, 16]);
    expect(engine.settled).toBe(false);
    expect(onUpdate).toHaveBeenCalledOnce();
    engine.tick();
    expect(tickCommands(worker)).toHaveLength(2);
  });

  it('recycles a tick snapshot invalidated by a structural configuration change', () => {
    const onUpdate = vi.fn();
    const onFrameRequest = vi.fn();
    const { engine, worker } = createEngine(onUpdate, onFrameRequest);
    const [first] = outputBuffers(worker);

    engine.tick();
    engine.setConfig({ centralGravity: 0.2 });
    publishTick(worker, first);

    expect(engine.x[0]).toBe(0);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onFrameRequest).toHaveBeenCalledOnce();
    engine.tick();
    expect(tickCommands(worker)[1].recycledBuffers).toEqual([first]);
  });

  it('synchronizes plugin-owned kinematics before accepting the next worker tick', () => {
    const { engine, worker } = createEngine();
    const [first] = outputBuffers(worker);

    engine.tick();
    engine.setKinematics(
      Float32Array.of(12),
      Float32Array.of(13),
      Float32Array.of(2),
      Float32Array.of(3),
    );
    publishTick(worker, first);

    expect(Array.from(engine.x)).toEqual([12]);
    expect(Array.from(engine.y)).toEqual([13]);
    expect(worker.messages).toContainEqual(expect.objectContaining({ type: 'setKinematics' }));
  });

  it('coalesces direct drag positions to the latest worker command per display frame', () => {
    const { engine, worker } = createEngine();

    engine.setNodePosition(0, 10, 20);
    engine.setNodePosition(0, 30, 40);

    expect(worker.messages.filter(command => command.type === 'setNodePosition')).toHaveLength(0);
    engine.tick();
    expect(worker.messages.filter(command => command.type === 'setNodePosition')).toEqual([{
      type: 'setNodePosition',
      index: 0,
      mutationRevision: 1,
      x: 30,
      y: 40,
    }]);
  });

  it('coalesces display-frame ticks while a worker request is in flight', () => {
    const { engine, worker } = createEngine();
    const [first] = outputBuffers(worker);

    engine.tick();
    engine.tick();
    engine.tick();
    expect(tickCommands(worker)).toHaveLength(1);

    publishTick(worker, first);
    engine.tick();

    expect(tickCommands(worker)).toHaveLength(2);
    expect(tickCommands(worker)[0]).not.toHaveProperty('elapsedMs');
    expect(tickCommands(worker)[1]).not.toHaveProperty('elapsedMs');
  });

  it('does not submit ticks while paused or replay obsolete topology demand', () => {
    const paused = createEngine();
    const [first] = outputBuffers(paused.worker);
    paused.engine.tick();
    publishTick(paused.worker, first);
    paused.engine.pause();
    paused.engine.tick();
    paused.engine.resume();
    paused.engine.tick();
    expect(tickCommands(paused.worker)).toHaveLength(2);

    const replaced = createEngine();
    replaced.engine.tick();
    replaced.engine.tick();
    replaced.engine.setGraph({
      nodeIds: ['a', 'b'],
      initialX: Float32Array.of(0, 1),
      initialY: Float32Array.of(0, 1),
      radii: Float32Array.of(4, 4),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    replaced.engine.tick();
    expect(tickCommands(replaced.worker).map(command => command.revision)).toEqual([0, 1]);
  });

  it('recycles zero-step results without publishing false position updates', () => {
    const onUpdate = vi.fn();
    const onFrameRequest = vi.fn();
    const { engine, worker } = createEngine(onUpdate, onFrameRequest);
    const [first] = outputBuffers(worker);
    const version = engine.sampleRenderPositions?.(0).version;

    engine.tick();
    publishTick(worker, first, {
      result: { moving: true, settled: false, steps: 0 },
    }, 50);

    expect(engine.x[0]).toBe(0);
    expect(engine.sampleRenderPositions?.(10).version).toBe(version);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onFrameRequest).toHaveBeenCalledOnce();
    engine.tick();
    expect(tickCommands(worker)[1].recycledBuffers).toEqual([first]);
  });

  it('advances only when RAF calls tick and reports worker-authoritative alpha', () => {
    const onUpdate = vi.fn();
    const { engine, worker } = createEngine(onUpdate);
    const [first] = outputBuffers(worker);

    engine.tick();
    publishTick(worker, first, {
      alpha: 0.25,
      result: { moving: true, settled: false, steps: 1 },
    });

    expect(engine.alpha).toBe(0.25);
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(tickCommands(worker)).toHaveLength(1);

    engine.tick();
    expect(tickCommands(worker)).toHaveLength(2);
  });

  it('invalidates render positions after direct movement and fallback ticks', () => {
    const { engine, worker } = createEngine();
    const [first] = outputBuffers(worker);
    engine.tick();
    publishTick(worker, first, {}, 10);
    const initial = engine.sampleRenderPositions?.(performance.now());
    const initialVersion = initial?.version ?? 0;

    engine.setNodePosition(0, 40, 50);
    engine.pin(0);
    const dragged = engine.sampleRenderPositions?.(performance.now());
    expect(dragged?.x[0]).toBe(40);
    expect(dragged?.version).toBeGreaterThan(initialVersion);

    worker.onerror?.({ message: 'boom' } as ErrorEvent);
    engine.resume();
    engine.tick();
    const fallback = engine.sampleRenderPositions?.(performance.now());
    expect(fallback?.version).toBeGreaterThan(dragged?.version ?? 0);
  });

  it('wakes settled physics after external kinematics and keeps worker alpha authoritative', () => {
    const { engine, worker } = createEngine();
    const [first] = outputBuffers(worker);
    engine.tick();
    publishTick(worker, first, {
      alpha: 0.2,
      result: { moving: false, settled: true, steps: 1 },
    });

    engine.setAlphaTarget(0);
    expect(engine.alpha).toBe(0.2);
    engine.setConfig({ centralGravity: 0.2 });
    expect(engine.alpha).toBe(0.3);
    engine.setKinematics(
      Float32Array.of(10),
      Float32Array.of(20),
      Float32Array.of(1),
      Float32Array.of(2),
    );
    engine.tick();

    expect(engine.settled).toBe(false);
    expect(tickCommands(worker)).toHaveLength(2);

    worker.onerror?.({ message: 'boom' } as ErrorEvent);
    expect(engine.alpha).toBe(0.3);
  });

  it('does not request another worker tick after the accepted layout settles', () => {
    const { engine, worker } = createEngine();
    const [first] = outputBuffers(worker);

    engine.tick();
    publishTick(worker, first, {
      result: { moving: false, settled: true, steps: 1 },
    });
    engine.tick();

    expect(engine.settled).toBe(true);
    expect(tickCommands(worker)).toHaveLength(1);
  });

  it('discards old-sized buffers after a topology revision', () => {
    const { engine, worker } = createEngine();
    const [oldBuffer] = outputBuffers(worker);
    engine.tick();
    engine.setGraph({
      nodeIds: ['a', 'b'],
      initialX: Float32Array.of(0, 1),
      initialY: Float32Array.of(0, 1),
      radii: Float32Array.of(4, 4),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    publishTick(worker, oldBuffer);
    engine.tick();

    const initCommands = worker.messages.filter(command => command.type === 'init');
    const latestInit = initCommands.at(-1)!;
    expect(latestInit.type === 'init' && latestInit.outputBuffers[0].x.byteLength).toBe(8);
    expect(tickCommands(worker).at(-1)?.recycledBuffers).toBeUndefined();
  });

  it('ignores worker error messages from an obsolete topology revision', () => {
    const { engine, worker } = createEngine();
    engine.setGraph({
      nodeIds: ['a', 'b'],
      initialX: Float32Array.of(0, 1),
      initialY: Float32Array.of(0, 1),
      radii: Float32Array.of(4, 4),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    worker.onmessage?.({ data: {
      message: 'obsolete failure',
      revision: 0,
      type: 'error',
    } } as MessageEvent);
    engine.tick();

    expect(worker.terminate).not.toHaveBeenCalled();
    expect(tickCommands(worker).at(-1)?.revision).toBe(1);
  });

  it('continues from the latest accepted state when the worker fails', () => {
    const { engine, worker } = createEngine();
    const [first] = outputBuffers(worker);
    engine.tick();
    publishTick(worker, first);

    worker.onerror?.({ message: 'boom' } as ErrorEvent);
    const before = engine.x[0];
    const result = engine.tick();

    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(Number.isFinite(engine.x[0])).toBe(true);
    expect(engine.x[0]).not.toBe(0);
    expect(result.steps).toBeGreaterThan(0);
    expect(before).toBe(5);
  });
});
