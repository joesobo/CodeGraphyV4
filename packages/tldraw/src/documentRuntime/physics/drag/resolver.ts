import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { isNodeShape, type NodeShape, type ScriptShape } from '../shape/model';
import type { DragState } from './model';

export interface DragResolutionHost {
  drag: DragState;
  getCurrentShapes(): ScriptShape[];
  getEngine(): GraphLayoutEngine | undefined;
  prepareEngine(): void;
}

export interface DraggedNode {
  engine: GraphLayoutEngine;
  index: number;
  shape: NodeShape;
}

export function resolveDraggedNode(host: DragResolutionHost): DraggedNode | undefined {
  const entityId = host.drag.entityId;
  if (entityId === undefined) return undefined;
  host.prepareEngine();
  const engine = host.getEngine();
  if (engine === undefined) return undefined;
  const shape = host.getCurrentShapes().find(
    (candidate): candidate is NodeShape => isNodeShape(candidate)
      && candidate.meta.codegraphyEntityId === entityId,
  );
  if (shape === undefined) return undefined;
  const index = engine.getNodeIndex(entityId);
  if (index === undefined) return undefined;
  return { engine, index, shape };
}
