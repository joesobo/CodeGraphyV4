import { createGraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { FGLink } from '../../../../../../../../src/webview/components/graph/model/build';
import {
  transitionOwnedGraphCamera,
  type OwnedGraphCamera,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/camera/runtime/model';
import { createOwnedGraphInteractionHandlers } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction/model';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';
import { OwnedGraphLinkPicker } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking/link/model';
import { createOwnedGraphNodeHover } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction/hover/model';
import { OwnedGraphNodePicker } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking/node/model';
import { createInteractionNode } from './fixture';
import { createDefaultSurfaceProps } from '../../view/surface/fixture';

describe('owned graph lazy interaction picking', () => {
  it('synchronizes authoritative positions and rebuilds only the picker needed by the event', () => {
    const graphNode = createInteractionNode();
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
      membershipRevision: 0,
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

  it('skips distant edge hover and reuses the lazy link index while details are visible', () => {
    const source = { ...createInteractionNode(), id: 'source', x: -20 };
    const target = { ...createInteractionNode(), id: 'target', x: 20 };
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
      membershipRevision: 0,
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
