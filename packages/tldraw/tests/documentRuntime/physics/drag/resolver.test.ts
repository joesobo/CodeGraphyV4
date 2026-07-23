import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { describe, expect, it, vi } from 'vitest';
import {
  resolveDraggedNode,
  type DragResolutionHost,
} from '../../../../src/documentRuntime/physics/drag/resolver';

const node = {
  id: 'shape:a',
  type: 'geo',
  x: 0,
  y: 0,
  props: { w: 120, h: 120 },
  meta: { codegraphyKind: 'node' as const, codegraphyEntityId: 'a' },
};

function createHost(
  entityId: string | undefined,
  engine: GraphLayoutEngine | undefined,
  shapes = [node],
): { host: DragResolutionHost; prepareEngine: ReturnType<typeof vi.fn> } {
  const prepareEngine = vi.fn();
  return {
    host: {
      drag: { entityId },
      getCurrentShapes: () => shapes,
      getEngine: () => engine,
      prepareEngine,
    },
    prepareEngine,
  };
}

describe('tldraw dragged node resolver', () => {
  it('does not prepare physics before a CodeGraphy drag starts', () => {
    const { host, prepareEngine } = createHost(undefined, undefined);

    expect(resolveDraggedNode(host)).toBeUndefined();
    expect(prepareEngine).not.toHaveBeenCalled();
  });

  it('requires a live engine, matching CodeGraphy node, and engine index', () => {
    const indexedEngine = { getNodeIndex: vi.fn(() => 4) } as unknown as GraphLayoutEngine;
    const missingIndexEngine = { getNodeIndex: vi.fn(() => undefined) } as unknown as GraphLayoutEngine;

    expect(resolveDraggedNode(createHost('a', undefined).host)).toBeUndefined();
    expect(resolveDraggedNode(createHost('missing', indexedEngine).host)).toBeUndefined();
    expect(resolveDraggedNode(createHost('a', indexedEngine, [{ ...node, type: 'note' }]).host)).toBeUndefined();
    expect(resolveDraggedNode(createHost('a', missingIndexEngine).host)).toBeUndefined();
    expect(resolveDraggedNode(createHost('a', indexedEngine).host)).toEqual({
      engine: indexedEngine,
      index: 4,
      shape: node,
    });
  });
});
