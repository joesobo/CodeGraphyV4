import { isPinned, setVx, setVy, vx, vy } from '../../memory';

export function applyLinkImpulse(
  source: i32,
  target: i32,
  forceX: f64,
  forceY: f64,
  targetBias: f64,
): void {
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
