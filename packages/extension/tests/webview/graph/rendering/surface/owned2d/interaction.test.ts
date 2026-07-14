import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  transitionOwnedGraphCamera,
  type OwnedGraphCamera,
} from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/camera';
import { createOwnedGraphInteractionHandlers } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction';
import type { OwnedGraphLayout } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { OwnedGraphLinkPicker } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/linkPicking';
import { OwnedGraphNodePicker } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking';
import { createOwnedGraphNodeHover } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/nodeHover';
import { createOwnedGraphStageAttributionProfiler } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/attribution';
import { createOwnedGraphInteractionRecorder } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/recording';
import { createGraphLayoutEngine } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import { createDefaultSurfaceProps } from '../view/surfaceFixture';

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
    const performanceAttribution = createOwnedGraphStageAttributionProfiler();
    performanceAttribution.start();
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
      performanceAttributionRef: { current: performanceAttribution },
      performanceRecorderRef: { current: createOwnedGraphInteractionRecorder() },
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
    expect(performanceAttribution.stop()?.stages.pickingHover.eventCount).toBe(1);
  });

  it('pins a node once when pointer movement crosses the drag threshold', () => {
    const graphNode = node();
    const engine = createGraphLayoutEngine({
      nodeIds: ['a'],
      initialX: Float32Array.of(0),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(8),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    const pin = vi.spyOn(engine, 'pin');
    const layout: OwnedGraphLayout = {
      engine,
      links: [],
      nodes: [graphNode],
    };
    const recorder = createOwnedGraphInteractionRecorder();
    recorder.start({ neighborNodeIds: [], targetNodeId: 'a' });
    const runtime = {
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      clearLinkHover: () => false,
      contextGestureSessionRef: { current: null },
      engineStopNotifiedRef: { current: false },
      hoveredLinkRef: { current: null },
      hoveredNodeRef: { current: null },
      layoutRef: { current: layout },
      linkPickerPositionVersionRef: { current: -1 },
      linkPickerRef: { current: new OwnedGraphLinkPicker() },
      nodeHoverRef: { current: createOwnedGraphNodeHover() },
      pickerPositionVersionRef: { current: -1 },
      pickerRef: { current: new OwnedGraphNodePicker() },
      pointerSessionRef: { current: null },
      performanceAttributionRef: { current: createOwnedGraphStageAttributionProfiler() },
      performanceRecorderRef: { current: recorder },
      positionVersionRef: { current: 0 },
      propsRef: { current: createDefaultSurfaceProps() },
      requestFrameRef: { current: vi.fn() },
      setLinkTooltip: vi.fn(),
      synchronizedPositionVersionRef: { current: 0 },
    };
    const handlers = createOwnedGraphInteractionHandlers(runtime);
    const canvas = {
      getBoundingClientRect: () => ({ height: 100, left: 0, top: 0, width: 100 }),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    } as unknown as HTMLCanvasElement;
    const pointer = (clientX: number, timeStamp: number) => ({
      button: 0,
      currentTarget: canvas,
      nativeEvent: { clientX, clientY: 50, timeStamp },
      pointerId: 1,
    } as never);

    handlers.handlePointerDown(pointer(50, 10));
    expect(pin).not.toHaveBeenCalled();
    handlers.handlePointerMove(pointer(54, 12));
    expect(pin).toHaveBeenCalledOnce();
    expect(graphNode).toMatchObject({ x: 4, y: 0, fx: 4, fy: 0 });
    expect(Array.from(engine.x)).toEqual([4]);
    expect(runtime.positionVersionRef.current).toBe(1);
    expect(runtime.requestFrameRef.current).toHaveBeenCalled();
    handlers.handlePointerMove(pointer(60, 14));
    expect(pin).toHaveBeenCalledOnce();
    handlers.handlePointerUp(pointer(60, 16));
    expect(recorder.stop()?.inputs).toEqual([
      expect.objectContaining({ eventTimestampMs: 10, nodeId: 'a', phase: 'down' }),
      expect.objectContaining({ eventTimestampMs: 12, nodeId: 'a', phase: 'move' }),
      expect.objectContaining({ eventTimestampMs: 14, nodeId: 'a', phase: 'move' }),
      expect.objectContaining({ eventTimestampMs: 16, nodeId: 'a', phase: 'up' }),
    ]);
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
    const performanceAttribution = createOwnedGraphStageAttributionProfiler();
    performanceAttribution.start();
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
      performanceAttributionRef: { current: performanceAttribution },
      performanceRecorderRef: { current: createOwnedGraphInteractionRecorder() },
      positionVersionRef: { current: 1 },
      propsRef: { current: createDefaultSurfaceProps() },
      requestFrameRef: { current: requestFrame },
      setLinkTooltip,
      synchronizedPositionVersionRef: { current: 0 },
    };
    const canvas = {
      getBoundingClientRect: () => ({ height: 100, left: 0, top: 0, width: 100 }),
    } as unknown as HTMLCanvasElement;
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
    createOwnedGraphInteractionHandlers(runtime).handleWheel({
      currentTarget: canvas,
      deltaY: -1,
      nativeEvent: { clientX: 50, clientY: 50 },
    } as never);
    expect(cameraRef.current.transition).toBeNull();
    expect(runtime.clearLinkHover).toHaveBeenCalledTimes(2);
    expect(performanceAttribution.stop()?.stages.pickingHover.eventCount).toBe(7);
  });
});
