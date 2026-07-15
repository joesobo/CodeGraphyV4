import {
  edgeCount,
  edgeSource,
  edgeTarget,
  isHidden,
} from '../memory';
import { applyLinkForce } from './linkPair';

export function applyLinkForces(alpha: f64): void {
  for (let edge = 0; edge < edgeCount; edge += 1) {
    const source = <i32>edgeSource(edge);
    const target = <i32>edgeTarget(edge);
    if (isHidden(source) || isHidden(target)) continue;
    applyLinkForce(alpha, source, target);
  }
}
