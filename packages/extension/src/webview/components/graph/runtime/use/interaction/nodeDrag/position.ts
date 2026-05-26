import { isFiniteNumber } from '../../../physics/numeric';
import type { FGNode } from '../../../../model/build';
import type { NodeDragTranslate } from './types';

export function isFiniteTranslate(translate: NodeDragTranslate): boolean {
  return isFiniteNumber(translate.x) && isFiniteNumber(translate.y);
}

export function moveNodeByTranslate(node: FGNode, translate: NodeDragTranslate): void {
  if (!isFiniteTranslate(translate)) {
    return;
  }

  const x = (isFiniteNumber(node.x) ? node.x : 0) + translate.x;
  const y = (isFiniteNumber(node.y) ? node.y : 0) + translate.y;
  node.x = x;
  node.y = y;
  node.fx = x;
  node.fy = y;
  node.vx = 0;
  node.vy = 0;
}
