import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { createOwnedGraphInteractionHandlers } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction';
import type { OwnedGraphLayout } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { OwnedGraphLinkPicker } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/linkPicking';
import { OwnedGraphNodePicker } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking';
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
      kind: 'main-thread',
      links: [],
      nodes: [graphNode],
    };
    const picker = new OwnedGraphNodePicker();
    const rebuildNode = vi.spyOn(picker, 'rebuild');
    const linkPicker = new OwnedGraphLinkPicker();
    const rebuildLink = vi.spyOn(linkPicker, 'rebuild');
    const props = createDefaultSurfaceProps();
    const handlers = createOwnedGraphInteractionHandlers({
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      ctrlClickSessionRef: { current: null },
      engineStopNotifiedRef: { current: false },
      hoveredLinkRef: { current: null },
      hoveredNodeRef: { current: null },
      layoutRef: { current: layout },
      linkPickerPositionVersionRef: { current: -1 },
      linkPickerRef: { current: linkPicker },
      pickerPositionVersionRef: { current: -1 },
      pickerRef: { current: picker },
      pointerSessionRef: { current: null },
      positionVersionRef: { current: 1 },
      propsRef: { current: props },
      requestFrameRef: { current: vi.fn() },
      setLinkTooltip: vi.fn(),
      skipPhysicsFrameRef: { current: false },
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
    expect(rebuildNode).toHaveBeenCalledOnce();
    expect(rebuildLink).not.toHaveBeenCalled();
  });
});
