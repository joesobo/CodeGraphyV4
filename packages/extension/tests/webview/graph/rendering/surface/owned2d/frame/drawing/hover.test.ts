import {
  createGraphLayoutEngine,
  type WebGpuGraphFrame as OwnedWebGpuFrame,
  type WebGpuGraphRenderer as OwnedWebGpuRenderer,
} from '@codegraphy-dev/graph-renderer';
import { describe, expect, it, vi } from 'vitest';
import { renderOwnedGraphFrame } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/render';
import { setOwnedGraphNodeHover } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction/hover/model';
import { canvasFixture, runtimeFixture } from '../runtime/fixture';

describe('owned graph frame hover', () => {
  it('animates node hover emphasis without keeping settled frames alive', () => {
    let submittedFrame: OwnedWebGpuFrame | undefined;
    const renderer = {
      render: vi.fn((frame: OwnedWebGpuFrame) => { submittedFrame = frame; }),
    } as unknown as OwnedWebGpuRenderer;
    const { layout, node, runtime } = runtimeFixture(renderer);
    vi.spyOn(layout.engine, 'tick').mockReturnValue({
      moving: false,
      settled: true,
      steps: 0,
    });
    setOwnedGraphNodeHover(runtime.nodeHoverRef.current, node.id, 100);

    renderOwnedGraphFrame(runtime, canvasFixture(), 160);
    expect(submittedFrame).toMatchObject({
      hoveredNodeIndex: 0,
      hoveredNodeScale: 1.05,
    });
    expect(runtime.requestFrameRef.current).toHaveBeenCalledOnce();

    vi.mocked(runtime.requestFrameRef.current).mockClear();
    renderOwnedGraphFrame(runtime, canvasFixture(), 220);
    expect(submittedFrame).toMatchObject({
      hoveredNodeIndex: 0,
      hoveredNodeScale: 1.1,
    });
    expect(runtime.requestFrameRef.current).not.toHaveBeenCalled();
    expect(runtime.markPerformanceIdle).toHaveBeenCalledOnce();
  });

  it('resolves hover identity after graph reordering and clears removed nodes', () => {
    let submittedFrame: OwnedWebGpuFrame | undefined;
    const renderer = {
      render: vi.fn((frame: OwnedWebGpuFrame) => { submittedFrame = frame; }),
    } as unknown as OwnedWebGpuRenderer;
    const { node, runtime } = runtimeFixture(renderer);
    runtime.pluginForcesRef.current.active = () => false;
    runtime.hoveredNodeRef.current = node;
    setOwnedGraphNodeHover(runtime.nodeHoverRef.current, node.id, 100);

    const replacementNode = { ...node };
    const otherNode = { ...node, id: 'b', label: 'b' };
    const reorderedEngine = createGraphLayoutEngine({
      nodeIds: [otherNode.id, replacementNode.id],
      initialX: Float32Array.of(20, 0),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(4, 4),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    vi.spyOn(reorderedEngine, 'tick').mockReturnValue({
      moving: false,
      settled: true,
      steps: 0,
    });
    runtime.layoutRef.current = {
      engine: reorderedEngine,
      links: [],
      membershipRevision: 0,
      nodes: [otherNode, replacementNode],
    };

    renderOwnedGraphFrame(runtime, canvasFixture(), 220);
    expect(submittedFrame?.hoveredNodeIndex).toBe(1);
    expect(runtime.hoveredNodeRef.current).toBe(replacementNode);
    expect(runtime.propsRef.current.sharedProps.onNodeHover)
      .toHaveBeenCalledWith(replacementNode);

    const removedEngine = createGraphLayoutEngine({
      nodeIds: [otherNode.id],
      initialX: Float32Array.of(20),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(4),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    vi.spyOn(removedEngine, 'tick').mockReturnValue({
      moving: false,
      settled: true,
      steps: 0,
    });
    runtime.layoutRef.current = {
      engine: removedEngine, links: [], membershipRevision: 0, nodes: [otherNode],
    };

    renderOwnedGraphFrame(runtime, canvasFixture(), 240);
    expect(submittedFrame?.hoveredNodeIndex).toBe(-1);
    expect(runtime.hoveredNodeRef.current).toBeNull();
    expect(runtime.nodeHoverRef.current).toMatchObject({
      nodeId: null,
      scale: 1,
      transition: null,
    });
    expect(runtime.propsRef.current.sharedProps.onNodeHover).toHaveBeenCalledWith(null);
  });

});
