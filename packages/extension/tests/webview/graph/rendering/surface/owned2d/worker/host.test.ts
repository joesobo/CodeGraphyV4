import { describe, expect, it, vi } from 'vitest';
import {
  GraphNodeFlag,
  type GraphLayoutEngine,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/contracts';
import {
  createEngine,
  outputBuffers,
  publishTick,
  tickCommands,
} from './hostFixture';

describe('worker-hosted graph layout lifecycle', () => {
  it('exposes the initialized graph contract through the hosted engine', () => {
    const { engine } = createEngine(vi.fn(), vi.fn(), {
      nodeIds: ['a', 'b'],
      initialX: Float32Array.of(1, 2),
      initialY: Float32Array.of(3, 4),
      radii: Float32Array.of(5, 6),
      flags: Uint8Array.of(GraphNodeFlag.Pinned, 0),
      chargeStrengthMultipliers: Float32Array.of(0.5, 1.5),
      edgeSources: Uint32Array.of(0),
      edgeTargets: Uint32Array.of(1),
      targetX: Float32Array.of(7, 8),
      targetY: Float32Array.of(9, 10),
    });

    expect(engine.nodeIds).toEqual(['a', 'b']);
    expect(engine.getNodeIndex('b')).toBe(1);
    expect(Array.from(engine.chargeStrengthMultipliers)).toEqual([0.5, 1.5]);
    expect(Array.from(engine.radii)).toEqual([5, 6]);
    expect(Array.from(engine.flags)).toEqual([GraphNodeFlag.Pinned, 0]);
    expect(Array.from(engine.edgeSources)).toEqual([0]);
    expect(Array.from(engine.edgeTargets)).toEqual([1]);
    expect(Array.from(engine.targetX)).toEqual([7, 8]);
    expect(Array.from(engine.targetY)).toEqual([9, 10]);
  });

  it('routes structural and simulation controls with monotonic revisions', () => {
    const { engine, worker } = createEngine();

    engine.pin(0);
    expect(engine.flags[0] & GraphNodeFlag.Pinned).toBe(GraphNodeFlag.Pinned);
    engine.release(0);
    expect(engine.flags[0] & GraphNodeFlag.Pinned).toBe(0);
    engine.setConfig({ centralGravity: 0.2 });
    engine.setHidden(0, true);
    expect(engine.flags[0] & GraphNodeFlag.Hidden).toBe(GraphNodeFlag.Hidden);
    engine.setHidden(0, false);
    expect(engine.flags[0] & GraphNodeFlag.Hidden).toBe(0);
    engine.setAlpha(0.4);
    expect(engine.alpha).toBe(0.4);
    engine.setAlphaTarget(0.2);
    engine.reheat(0.5);
    expect(engine.alpha).toBe(0.5);
    engine.pause();
    engine.resume();

    expect(worker.messages.slice(1)).toEqual([
      { type: 'pin', index: 0, mutationRevision: 1 },
      { type: 'release', index: 0, mutationRevision: 2 },
      {
        type: 'setConfig',
        config: { centralGravity: 0.2 },
        mutationRevision: 3,
        structuralRevision: 1,
      },
      {
        type: 'setHidden',
        hidden: true,
        index: 0,
        mutationRevision: 4,
        structuralRevision: 2,
      },
      {
        type: 'setHidden',
        hidden: false,
        index: 0,
        mutationRevision: 5,
        structuralRevision: 3,
      },
      { type: 'setAlpha', alpha: 0.4, mutationRevision: 6 },
      { type: 'setAlphaTarget', alpha: 0.2, mutationRevision: 7 },
      { type: 'reheat', alpha: 0.5, mutationRevision: 8 },
      { type: 'pause', mutationRevision: 9 },
      { type: 'resume', mutationRevision: 10 },
    ]);
  });

  it('does not reheat an empty graph when applying configuration', () => {
    const { engine } = createEngine(vi.fn(), vi.fn(), {
      nodeIds: [],
      initialX: new Float32Array(),
      initialY: new Float32Array(),
      radii: new Float32Array(),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    engine.setAlpha(0.1);
    engine.setConfig({ centralGravity: 0.2 });

    expect(engine.alpha).toBe(0.1);
  });

  it.each([
    ['direct position', (engine: GraphLayoutEngine) => engine.setNodePosition(0, 10, 20)],
    ['hidden state', (engine: GraphLayoutEngine) => engine.setHidden(0, true)],
    ['alpha target', (engine: GraphLayoutEngine) => engine.setAlphaTarget(0.2)],
    ['reheat', (engine: GraphLayoutEngine) => engine.reheat(0.5)],
  ])('wakes a settled layout after %s changes', (_name, mutate) => {
    const { engine, worker } = createEngine();
    const [first] = outputBuffers(worker);
    engine.tick();
    publishTick(worker, first, {
      result: { moving: false, settled: true, steps: 1 },
    });
    expect(engine.settled).toBe(true);

    mutate(engine);
    expect(engine.settled).toBe(false);
    engine.tick();

    expect(tickCommands(worker)).toHaveLength(2);
  });

  it('does not submit a tick while paused before the first frame', () => {
    const { engine, worker } = createEngine();

    engine.pause();
    expect(engine.tick()).toEqual({ moving: false, settled: false, steps: 0 });
    expect(tickCommands(worker)).toHaveLength(0);
    engine.resume();
    engine.tick();
    expect(tickCommands(worker)).toHaveLength(1);
  });

  it('keeps an already pinned node authoritative when accepting neighbor movement', () => {
    const { engine, worker } = createEngine();
    const [first] = outputBuffers(worker);

    engine.pin(0);
    engine.tick();
    publishTick(worker, first, { mutationRevision: 1 });

    expect(engine.x[0]).toBe(0);
    expect(engine.y[0]).toBe(0);
    expect(engine.vx[0]).toBe(0);
    expect(engine.vy[0]).toBe(0);
  });

  it('falls back once with the default error while preserving paused kinematics', () => {
    const onUpdate = vi.fn();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { engine, worker } = createEngine(onUpdate);

    engine.pause();
    worker.onerror?.({ message: '' } as ErrorEvent);
    worker.onerror?.({ message: 'second failure' } as ErrorEvent);
    engine.setKinematics(
      Float32Array.of(10),
      Float32Array.of(20),
      Float32Array.of(1),
      Float32Array.of(2),
    );

    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(
      '[CodeGraphy] Layout worker failed; using main-thread physics.',
      'Graph layout worker failed',
    );
    expect(Array.from(engine.x)).toEqual([10]);
    expect(Array.from(engine.y)).toEqual([20]);
    expect(engine.tick().steps).toBe(0);
    engine.resume();
    expect(engine.tick().steps).toBe(1);
  });

  it('ignores worker callbacks and further commands after disposal', () => {
    const onUpdate = vi.fn();
    const { engine, worker } = createEngine(onUpdate);
    const messagesBeforeDispose = worker.messages.length;

    engine.dispose?.();
    engine.setAlpha(0.4);
    worker.onerror?.({ message: 'late failure' } as ErrorEvent);
    worker.onmessage?.({ data: {
      message: 'late error',
      revision: 0,
      type: 'error',
    } } as MessageEvent);

    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.messages).toHaveLength(messagesBeforeDispose);
    expect(onUpdate).not.toHaveBeenCalled();
  });

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

  it('reuses a returned plugin-kinematics buffer for the latest pending state', () => {
    const onFrameRequest = vi.fn();
    const { engine, worker } = createEngine(vi.fn(), onFrameRequest);
    const setKinematics = (x: number): void => engine.setKinematics(
      Float32Array.of(x),
      Float32Array.of(x + 1),
      Float32Array.of(x + 2),
      Float32Array.of(x + 3),
    );

    setKinematics(10);
    setKinematics(20);
    setKinematics(30);
    const commands = () => worker.messages.filter(command => command.type === 'setKinematics');
    expect(commands()).toHaveLength(2);
    const returned = commands()[0];
    if (returned.type !== 'setKinematics') throw new Error('Expected kinematics command');
    worker.onmessage?.({ data: {
      buffers: returned.buffers,
      revision: 0,
      type: 'kinematicsBuffers',
    } } as MessageEvent);

    expect(commands()).toHaveLength(3);
    expect(commands().map(command => command.type === 'setKinematics'
      ? command.mutationRevision
      : -1)).toEqual([1, 2, 3]);
    const latest = commands()[2];
    if (latest.type !== 'setKinematics') throw new Error('Expected latest kinematics command');
    expect(Array.from(new Float32Array(latest.buffers.x))).toEqual([30]);
    expect(onFrameRequest).toHaveBeenCalledOnce();
  });

  it('coalesces all direct drag positions into one worker command per display frame', () => {
    const { engine, worker } = createEngine(vi.fn(), vi.fn(), {
      nodeIds: ['primary', 'selected'],
      initialX: Float32Array.of(0, 5),
      initialY: Float32Array.of(0, 5),
      radii: Float32Array.of(4, 4),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    engine.setNodePosition(0, 10, 20);
    engine.setNodePosition(0, 30, 40);
    engine.setNodePosition(1, 50, 60);

    const positionCommands = () => (worker.messages as unknown as Array<{
      type: string;
      mutationRevision: number;
      positions: Array<{ index: number; x: number; y: number }>;
    }>).filter(command => command.type === 'setNodePositions');
    expect(positionCommands()).toHaveLength(0);
    engine.tick();
    expect(positionCommands()).toEqual([{
      type: 'setNodePositions',
      mutationRevision: 1,
      positions: [
        { index: 0, x: 30, y: 40 },
        { index: 1, x: 50, y: 60 },
      ],
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
