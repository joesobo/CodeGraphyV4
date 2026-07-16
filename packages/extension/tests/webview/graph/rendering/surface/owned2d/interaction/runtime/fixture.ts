import { vi } from 'vitest';
import { createGraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import type { FGNode } from '../../../../../../../../src/webview/components/graph/model/build';
import {
  createOwnedGraphInteractionHandlers,
  type PointerSession,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction/model';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';
import { OwnedGraphLinkPicker } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking/link/model';
import { createOwnedGraphNodeHover } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction/hover/model';
import { OwnedGraphNodePicker } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/picking/node/model';
import { createDefaultSurfaceProps } from '../../view/surface/fixture';

export function createInteractionNode(): FGNode {
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

export function createSingleNodeInteractionFixture() {
  const graphNode = createInteractionNode();
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
  const getBoundingClientRect = vi.fn(
    () => ({ height: 100, left: 0, top: 0, width: 100 }),
  );
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
