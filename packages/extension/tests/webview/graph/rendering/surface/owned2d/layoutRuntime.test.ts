import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { GraphNodeFlag } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import {
  applyOwnedGraphRuntimePhysicsSettings,
  reconcileOwnedGraphRuntime,
  type OwnedGraphLayoutRuntime,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layoutRuntime';
import type { PointerSession } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction';
import { createDefaultSurfaceProps } from '../view/surfaceFixture';

function node(id: string, overrides: Partial<FGNode> = {}): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#000',
    borderWidth: 1,
    color: '#fff',
    id,
    isFavorite: false,
    isPinned: false,
    label: id,
    size: 8,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function runtime(): OwnedGraphLayoutRuntime {
  const props = createDefaultSurfaceProps();
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({
    bottom: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return {
    cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
    canvasRef: { current: canvas },
    engineStopNotifiedRef: { current: true },
    hasFittedCameraRef: { current: false },
    layoutRef: { current: null },
    pluginForcesRef: { current: {
      active: vi.fn(() => false),
      dispose: vi.fn(),
      sync: vi.fn(() => false),
      tick: vi.fn(),
    } },
    pointerSessionRef: { current: null },
    positionVersionRef: { current: 0 },
    propsRef: { current: props },
    rendererOperationalRef: { current: true },
    requestFrameRef: { current: vi.fn() },
    setLayoutKind: vi.fn(),
  };
}

function pointerSession(primary: FGNode): PointerSession {
  return {
    draggedIndexes: new Set([0]),
    index: 0,
    lastWorld: { x: 0, y: 0 },
    link: null,
    moved: true,
    node: primary,
    nodeId: primary.id,
    startScreen: { x: 0, y: 0 },
  };
}

describe('owned graph layout runtime', () => {
  it('fits only after an empty graph receives positioned nodes', () => {
    const state = runtime();

    reconcileOwnedGraphRuntime(state);
    expect(state.hasFittedCameraRef.current).toBe(false);

    state.propsRef.current.sharedProps.graphData = { links: [], nodes: [node('a')] };
    reconcileOwnedGraphRuntime(state);

    expect(state.hasFittedCameraRef.current).toBe(true);
    expect(state.layoutRef.current?.nodes.map(candidate => candidate.id)).toEqual(['a']);
    expect(state.setLayoutKind).toHaveBeenLastCalledWith('main-thread');
    expect(state.requestFrameRef.current).toHaveBeenCalledTimes(2);
  });

  it('finalizes a removed primary drag and remaps retained link sessions', () => {
    const state = runtime();
    const primary = node('a', { isDragging: true });
    const survivor = node('b', { isDragging: true });
    state.propsRef.current.sharedProps.graphData = { links: [], nodes: [primary, survivor] };
    reconcileOwnedGraphRuntime(state);
    state.pointerSessionRef.current = pointerSession(primary);

    state.propsRef.current.sharedProps.graphData = { links: [], nodes: [survivor] };
    reconcileOwnedGraphRuntime(state);

    expect(state.propsRef.current.sharedProps.onNodeDragEnd).toHaveBeenCalledWith(primary);
    expect(state.pointerSessionRef.current).toBeNull();
    expect((state.layoutRef.current?.engine.flags[0] ?? 0) & GraphNodeFlag.Pinned).toBe(0);

    const source = node('source');
    const target = node('target');
    const previousLink = { id: 'edge', source, target } as FGLink;
    const nextLink = { id: 'edge', source, target, kind: 'import' } as FGLink;
    state.propsRef.current.sharedProps.graphData = {
      links: [previousLink],
      nodes: [source, target],
    };
    reconcileOwnedGraphRuntime(state);
    state.pointerSessionRef.current = {
      ...pointerSession(source),
      index: null,
      link: previousLink,
      moved: false,
      node: null,
      nodeId: null,
    };
    state.propsRef.current.sharedProps.graphData = { links: [nextLink], nodes: [source, target] };
    reconcileOwnedGraphRuntime(state);

    expect(state.pointerSessionRef.current?.link).toBe(nextLink);
  });

  it('applies force settings without changing animation policy', () => {
    const state = runtime();
    state.propsRef.current.sharedProps.graphData = { links: [], nodes: [node('a')] };
    reconcileOwnedGraphRuntime(state);
    const engine = state.layoutRef.current!.engine;
    const pause = vi.spyOn(engine, 'pause');
    const resume = vi.spyOn(engine, 'resume');
    const reheat = vi.spyOn(engine, 'reheat');

    applyOwnedGraphRuntimePhysicsSettings(state);

    expect(pause).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
    expect(reheat).toHaveBeenLastCalledWith(0.3);
    expect(reheat).not.toHaveBeenCalledWith();
    expect(state.engineStopNotifiedRef.current).toBe(false);
  });
});
