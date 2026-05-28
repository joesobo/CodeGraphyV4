import { isFiniteNumber } from '../../../physics/numeric';
import type { FGNode } from '../../../../model/build';
import type { NodeDragPositionOrigin, NodeDragTranslate } from './types';

export function isFiniteTranslate(translate: NodeDragTranslate): boolean {
  return isFiniteNumber(translate.x) && isFiniteNumber(translate.y);
}

export function moveNodeByTranslate(node: FGNode, translate: NodeDragTranslate): void {
  if (!isFiniteTranslate(translate)) {
    return;
  }

  moveNodeFromOriginByTranslate(node, readNodePositionOrigin(node), translate);
}

export function readNodePositionOrigin(node: FGNode): NodeDragPositionOrigin {
  return {
    x: isFiniteNumber(node.x) ? node.x : 0,
    y: isFiniteNumber(node.y) ? node.y : 0,
  };
}

export function moveNodeFromOriginByTranslate(
  node: FGNode,
  origin: NodeDragPositionOrigin,
  translate: NodeDragTranslate,
): void {
  if (!isFiniteTranslate(translate)) {
    return;
  }

  const x = origin.x + translate.x;
  const y = origin.y + translate.y;
  node.x = x;
  node.y = y;
  node.fx = x;
  node.fy = y;
  node.vx = 0;
  node.vy = 0;
}
