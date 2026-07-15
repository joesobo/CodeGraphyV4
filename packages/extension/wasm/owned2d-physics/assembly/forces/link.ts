import { linkDistance, linkStrength } from '../config';
import { deterministicDirectionAngle } from '../initialization';
import {
  edgeCount,
  edgeSource,
  edgeTarget,
  isHidden,
  isPinned,
  linkDegree,
  setVx,
  setVy,
  vx,
  vy,
  x,
  y,
} from '../memory';

export function applyLinkForces(alpha: f64): void {
  for (let edge = 0; edge < edgeCount; edge += 1) {
    const source = <i32>edgeSource(edge);
    const target = <i32>edgeTarget(edge);
    if (isHidden(source) || isHidden(target)) continue;
    applyLinkForce(alpha, source, target);
  }
}

function applyLinkForce(alpha: f64, source: i32, target: i32): void {
  let dx = x(target) + vx(target) - x(source) - vx(source);
  let dy = y(target) + vy(target) - y(source) - vy(source);
  if (dx == 0 || dy == 0) {
    const angle = deterministicDirectionAngle(source, target);
    if (dx == 0) dx = Math.cos(angle) * 1e-6;
    if (dy == 0) dy = Math.sin(angle) * 1e-6;
  }
  const distance = Math.sqrt(dx * dx + dy * dy);
  const sourceDegree = <f64>linkDegree(source);
  const targetDegree = <f64>linkDegree(target);
  const strength = linkStrength / Math.min(sourceDegree, targetDegree);
  const impulse = ((distance - linkDistance) / distance) * alpha * strength;
  const forceX = dx * impulse;
  const forceY = dy * impulse;
  const targetBias = sourceDegree / (sourceDegree + targetDegree);

  if (!isPinned(target)) {
    setVx(target, vx(target) - forceX * targetBias);
    setVy(target, vy(target) - forceY * targetBias);
  }
  if (!isPinned(source)) {
    const sourceBias = 1 - targetBias;
    setVx(source, vx(source) + forceX * sourceBias);
    setVy(source, vy(source) + forceY * sourceBias);
  }
}
