import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  transitionOwnedGraphCamera,
  type OwnedGraphCamera,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/camera';
import {
  createOwnedGraphInteractionHandlers,
  type PointerSession,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction';
import type { OwnedGraphLayout } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { OwnedGraphLinkPicker } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/linkPicking';
import { OwnedGraphNodePicker } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking';
import { createOwnedGraphNodeHover } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/nodeHover';
import { createGraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { createDefaultSurfaceProps } from './surfaceFixture';

function node(): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 1,
    color: '#ffffff',
    id: 'a',
    isFavorite: false,
    isPinned: false,
    label: 'a',
    size: 8,
    x: 0,
    y: 0,
  } as FGNode;
}

function createSingleNodeInteractionFixture() {
  const graphNode = node();
  const engine = createGraphLayoutEngine({
    nodeIds: ['a'],
    initialX: Float32Array.of(0),
    initialY: Float32Array.of(0),
    radii: Float32Array.of(8),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  });
  const layout: OwnedGraphLayout = {
    engine,
    links: [],
    nodes: [graphNode],
  };
  const props = createDefaultSurfaceProps();
  const runtime = {
    cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
    clearLinkHover: vi.fn(() => false),
    contextGestureSessionRef: { current: null },
    engineStopNotifiedRef: { current: false },
    hoveredLinkRef: { current: null },
    hoveredNodeRef: { current: null as FGNode | null },
    layoutRef: { current: layout },
    linkPickerPositionVersionRef: { current: -1 },
    linkPickerRef: { current: new OwnedGraphLinkPicker() },
    nodeHoverRef: { current: createOwnedGraphNodeHover() },
    pickerPositionVersionRef: { current: -1 },
    pickerRef: { current: new OwnedGraphNodePicker() },
    pointerSessionRef: { current: null as PointerSession | null },
    positionVersionRef: { current: 0 },
    propsRef: { current: props },
    requestFrameRef: { current: vi.fn() },
    setLinkTooltip: vi.fn(),
    synchronizedPositionVersionRef: { current: 0 },
  };
  const handlers = createOwnedGraphInteractionHandlers(runtime);
  const getBoundingClientRect = vi.fn(() => ({ height: 100, left: 0, top: 0, width: 100 }));
  const canvas = {
    getBoundingClientRect,
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  } as unknown as HTMLCanvasElement;
  const pointer = (clientX: number, timeStamp: number) => ({
    button: 0,
    ctrlKey: false,
    currentTarget: canvas,
    nativeEvent: { clientX, clientY: 50, timeStamp },
    pointerId: 1,
  } as never);
  return {
    canvas,
    engine,
    getBoundingClientRect,
    graphNode,
    handlers,
    layout,
    pointer,
    props,
    runtime,
  };
}

describe('owned graph lazy interaction picking', () => {
  it('synchronizes authoritative positions and rebuilds only the picker needed by the event', () => {
    const graphNode = node();
    const engine = createGraphLayoutEngine({
      nodeIds: ['a'],
      initialX: Float32Array.of(20),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(8),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    const layout: OwnedGraphLayout = {
      engine,
      links: [],
      nodes: [graphNode],
    };
    const picker = new OwnedGraphNodePicker();
    const rebuildNode = vi.spyOn(picker, 'rebuild');
    const linkPicker = new OwnedGraphLinkPicker();
    const rebuildLink = vi.spyOn(linkPicker, 'rebuild');
    const props = createDefaultSurfaceProps();
    const requestFrame = vi.fn();
    const handlers = createOwnedGraphInteractionHandlers({
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      clearLinkHover: () => false,
      contextGestureSessionRef: { current: null },
      engineStopNotifiedRef: { current: false },
      hoveredLinkRef: { current: null },
      hoveredNodeRef: { current: graphNode },
      layoutRef: { current: layout },
      linkPickerPositionVersionRef: { current: -1 },
      linkPickerRef: { current: linkPicker },
      nodeHoverRef: { current: createOwnedGraphNodeHover() },
      pickerPositionVersionRef: { current: -1 },
      pickerRef: { current: picker },
      pointerSessionRef: { current: null },
      positionVersionRef: { current: 1 },
      propsRef: { current: props },
      requestFrameRef: { current: requestFrame },
      setLinkTooltip: vi.fn(),
      synchronizedPositionVersionRef: { current: 0 },
    });
    const canvas = {
      getBoundingClientRect: () => ({ height: 100, left: 0, top: 0, width: 100 }),
      setPointerCapture: vi.fn(),
    } as unknown as HTMLCanvasElement;

    handlers.handlePointerDown({
      button: 0,
      ctrlKey: false,
      currentTarget: canvas,
      nativeEvent: { clientX: 70, clientY: 50 },
      pointerId: 1,
    } as never);

    expect(graphNode.x).toBe(20);
    expect(props.sharedProps.onNodeHover).toHaveBeenCalledWith(null);
    expect(rebuildNode).toHaveBeenCalledOnce();
    expect(rebuildLink).not.toHaveBeenCalled();
    expect(requestFrame).toHaveBeenCalledOnce();
  });

  it('pins a node once when pointer movement crosses the drag threshold', () => {
    const fixture = createSingleNodeInteractionFixture();
    const pin = vi.spyOn(fixture.engine, 'pin');

    fixture.handlers.handlePointerDown(fixture.pointer(50, 10));
    expect(pin).not.toHaveBeenCalled();
    fixture.handlers.handlePointerMove(fixture.pointer(54, 12));
    expect(pin).toHaveBeenCalledOnce();
    expect(fixture.graphNode).toMatchObject({ x: 4, y: 0, fx: 4, fy: 0 });
    expect(Array.from(fixture.engine.x)).toEqual([4]);
    expect(fixture.runtime.positionVersionRef.current).toBe(1);
    expect(fixture.runtime.requestFrameRef.current).toHaveBeenCalled();
    fixture.handlers.handlePointerMove(fixture.pointer(60, 14));
    expect(pin).toHaveBeenCalledOnce();
    fixture.handlers.handlePointerUp(fixture.pointer(60, 16));
    expect(fixture.getBoundingClientRect).toHaveBeenCalledTimes(3);
  });

  it('releases a dragged node and notifies the host when the pointer is canceled', () => {
    const fixture = createSingleNodeInteractionFixture();

    fixture.handlers.handlePointerDown(fixture.pointer(50, 10));
    fixture.handlers.handlePointerMove(fixture.pointer(54, 12));
    fixture.handlers.handlePointerCancel(fixture.pointer(54, 14));

    expect(fixture.runtime.pointerSessionRef.current).toBeNull();
    expect(fixture.graphNode).toMatchObject({ fx: undefined, fy: undefined });
    expect(fixture.props.sharedProps.onNodeDragEnd).toHaveBeenCalledOnce();
    expect(fixture.props.sharedProps.onNodeDragEnd).toHaveBeenCalledWith(fixture.graphNode);
    expect(fixture.canvas.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('clears node and link hover when the pointer leaves an idle surface', () => {
    const fixture = createSingleNodeInteractionFixture();
    fixture.runtime.hoveredNodeRef.current = fixture.graphNode;
    fixture.runtime.clearLinkHover.mockReturnValueOnce(true);

    fixture.handlers.handlePointerLeave();

    expect(fixture.runtime.hoveredNodeRef.current).toBeNull();
    expect(fixture.props.sharedProps.onNodeHover).toHaveBeenCalledWith(null);
    expect(fixture.runtime.clearLinkHover).toHaveBeenCalledOnce();
    expect(fixture.runtime.requestFrameRef.current).toHaveBeenCalledTimes(2);
  });

  it('preserves node hover while an active pointer session owns the surface', () => {
    const fixture = createSingleNodeInteractionFixture();
    fixture.runtime.hoveredNodeRef.current = fixture.graphNode;
    fixture.runtime.pointerSessionRef.current = {
      draggedIndexes: new Set(),
      index: 0,
      lastWorld: { x: 0, y: 0 },
      link: null,
      moved: false,
      node: fixture.graphNode,
      nodeId: fixture.graphNode.id,
      startScreen: { x: 50, y: 50 },
    };

    fixture.handlers.handlePointerLeave();

    expect(fixture.runtime.hoveredNodeRef.current).toBe(fixture.graphNode);
    expect(fixture.props.sharedProps.onNodeHover).not.toHaveBeenCalled();
    expect(fixture.runtime.requestFrameRef.current).not.toHaveBeenCalled();
  });

  it('skips distant edge hover and reuses the lazy link index while details are visible', () => {
    const source = { ...node(), id: 'source', x: -20 };
    const target = { ...node(), id: 'target', x: 20 };
    const link = { id: 'source-target', source, target } as FGLink;
    const engine = createGraphLayoutEngine({
      nodeIds: ['source', 'target'],
      initialX: Float32Array.of(-20, 20),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(8, 8),
      edgeSources: Uint32Array.of(0),
      edgeTargets: Uint32Array.of(1),
    });
    const layout: OwnedGraphLayout = {
      engine,
      links: [link],
      nodes: [source, target],
    };
    const linkPicker = new OwnedGraphLinkPicker();
    const rebuildLink = vi.spyOn(linkPicker, 'rebuild');
    const hoveredLinkRef = { current: link as FGLink | null };
    const setLinkTooltip = vi.fn();
    const requestFrame = vi.fn();
    const cameraRef: { current: OwnedGraphCamera } = {
      current: { centerX: 0, centerY: 0, zoom: 0.49 },
    };
    const runtime = {
      cameraRef,
      clearLinkHover: vi.fn(() => {
        const changed = hoveredLinkRef.current !== null;
        hoveredLinkRef.current = null;
        if (changed) setLinkTooltip(null);
        return changed;
      }),
      contextGestureSessionRef: { current: null },
      engineStopNotifiedRef: { current: false },
      hoveredLinkRef,
      hoveredNodeRef: { current: null },
      layoutRef: { current: layout },
      linkPickerPositionVersionRef: { current: -1 },
      linkPickerRef: { current: linkPicker },
      nodeHoverRef: { current: createOwnedGraphNodeHover() },
      pickerPositionVersionRef: { current: -1 },
      pickerRef: { current: new OwnedGraphNodePicker() },
      pointerSessionRef: { current: null },
      positionVersionRef: { current: 1 },
      propsRef: { current: createDefaultSurfaceProps() },
      requestFrameRef: { current: requestFrame },
      setLinkTooltip,
      synchronizedPositionVersionRef: { current: 0 },
    };
    const getBoundingClientRect = vi.fn(
      () => ({ height: 100, left: 0, top: 0, width: 100 }),
    );
    const canvas = { getBoundingClientRect } as unknown as HTMLCanvasElement;
    const move = () => createOwnedGraphInteractionHandlers(runtime).handlePointerMove({
      currentTarget: canvas,
      nativeEvent: { clientX: 50, clientY: 50 },
      pointerId: 1,
    } as never);

    move();
    expect(runtime.clearLinkHover).toHaveBeenCalledOnce();
    expect(rebuildLink).not.toHaveBeenCalled();
    expect(requestFrame).toHaveBeenCalledOnce();

    cameraRef.current.zoom = 1;
    requestFrame.mockClear();
    move();
    move();
    expect(hoveredLinkRef.current).toBe(link);
    expect(rebuildLink).toHaveBeenCalledOnce();
    expect(setLinkTooltip).toHaveBeenCalledWith({
      link,
      screen: { x: 50, y: 50 },
    });
    expect(requestFrame).toHaveBeenCalledOnce();

    runtime.positionVersionRef.current += 1;
    move();
    expect(rebuildLink).toHaveBeenCalledTimes(2);

    transitionOwnedGraphCamera(cameraRef.current, { zoom: 4 }, 300, 100);
    getBoundingClientRect.mockClear();
    createOwnedGraphInteractionHandlers(runtime).handleWheel({
      currentTarget: canvas,
      deltaY: -1,
      nativeEvent: { clientX: 50, clientY: 50 },
    } as never);
    expect(cameraRef.current.transition).toBeNull();
    expect(getBoundingClientRect).toHaveBeenCalledOnce();
    expect(runtime.clearLinkHover).toHaveBeenCalledTimes(2);
  });
});
