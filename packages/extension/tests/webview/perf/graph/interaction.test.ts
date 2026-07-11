import { describe, expect, it, vi } from 'vitest';

import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  INTERACTION_DRAG_SELECTION_SIZE,
  INTERACTION_DRAG_TRANSLATE,
  runDeterministicInteractionBurst,
} from '../../../../src/webview/perf/graph/interaction';

function createNode(id: string, x: number, y: number): FGNode {
  return {
    id,
    label: id,
    color: '#ffffff',
    size: 12,
    x,
    y,
  } as FGNode;
}

describe('webview/perf/graph/interaction', () => {
  it('runs deterministic pan, zoom, and node drag through production paths', () => {
    const container = document.createElement('div');
    const panEvents: string[] = [];
    container.addEventListener('mousedown', event => panEvents.push(`${event.type}:${event.ctrlKey}`));
    container.addEventListener('mousemove', event => panEvents.push(`${event.type}:${event.ctrlKey}`));
    container.addEventListener('mouseup', event => panEvents.push(`${event.type}:${event.ctrlKey}`));
    const alpha = createNode('a.ts', 10, 20);
    const beta = createNode('b.ts', 30, 40);
    const handleNodeDrag = vi.fn();
    const handleNodeDragEnd = vi.fn();
    const zoomGraphView = vi.fn();
    const reheat = vi.fn();

    const result = runDeterministicInteractionBurst({
      container,
      graph: { d3ReheatSimulation: reheat },
      graphMode: '2d',
      handleNodeDrag,
      handleNodeDragEnd,
      nodes: [beta, alpha],
      zoomGraphView,
    });

    expect(panEvents).toEqual([
      'mousedown:true',
      'mousemove:true',
      'mouseup:true',
    ]);
    expect(zoomGraphView).toHaveBeenCalledWith(1.1);
    expect(handleNodeDrag).toHaveBeenCalledWith(alpha, INTERACTION_DRAG_TRANSLATE);
    expect(handleNodeDragEnd).toHaveBeenCalledWith(alpha);
    expect(alpha).toMatchObject({ x: 22, y: 28, fx: 22, fy: 28 });
    expect(reheat).toHaveBeenCalledOnce();
    expect(result).toEqual({ waitForSettle: true });
  });

  it('does not claim a settle path when the graph cannot be reheated', () => {
    const result = runDeterministicInteractionBurst({
      container: document.createElement('div'),
      graph: {},
      graphMode: '2d',
      handleNodeDrag: vi.fn(),
      handleNodeDragEnd: vi.fn(),
      nodes: [createNode('a.ts', 0, 0)],
      zoomGraphView: vi.fn(),
    });

    expect(result).toEqual({ waitForSettle: false });
  });

  it('prepares a deterministic 50-node selection before dragging', () => {
    const nodes = Array.from(
      { length: 60 },
      (_, index) => createNode(`node-${String(59 - index).padStart(2, '0')}`, index, index),
    );
    const selectNodeIds = vi.fn();
    const handleNodeDrag = vi.fn();

    runDeterministicInteractionBurst({
      container: null,
      graph: {},
      graphMode: '2d',
      handleNodeDrag,
      handleNodeDragEnd: vi.fn(),
      nodes,
      selectNodeIds,
      zoomGraphView: vi.fn(),
    });

    expect(selectNodeIds).toHaveBeenCalledWith(
      Array.from(
        { length: INTERACTION_DRAG_SELECTION_SIZE },
        (_, index) => `node-${String(index).padStart(2, '0')}`,
      ),
    );
    expect(handleNodeDrag.mock.calls[0]?.[0].id).toBe('node-00');
  });

  it('does not reheat a graph whose render budget disables simulation', () => {
    const reheat = vi.fn();

    const result = runDeterministicInteractionBurst({
      container: document.createElement('div'),
      graph: { d3ReheatSimulation: reheat },
      graphMode: '2d',
      handleNodeDrag: vi.fn(),
      handleNodeDragEnd: vi.fn(),
      nodes: [createNode('a.ts', 0, 0)],
      simulationEnabled: false,
      zoomGraphView: vi.fn(),
    });

    expect(reheat).not.toHaveBeenCalled();
    expect(result).toEqual({ waitForSettle: false });
  });
});
