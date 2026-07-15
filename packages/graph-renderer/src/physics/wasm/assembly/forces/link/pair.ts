import { linkDistance, linkStrength } from '../../parameters';
import { deterministicDirectionAngle } from '../../initialization';
import { linkDegree, vx, vy, x, y } from '../../memory';
import { applyLinkImpulse } from './impulse';

export function applyLinkForce(alpha: f64, source: i32, target: i32): void {
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
  const targetBias = sourceDegree / (sourceDegree + targetDegree);
  applyLinkImpulse(source, target, dx * impulse, dy * impulse, targetBias);
}
