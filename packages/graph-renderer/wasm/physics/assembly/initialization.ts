import { initializationSpacing } from './config';
import {
  isFiniteNumber,
  setVx,
  setVy,
  setX,
  setY,
  vx,
  vy,
  x,
  y,
} from './memory';

const GOLDEN_ANGLE: f64 = Math.PI * (3 - Math.sqrt(5));
const UINT32_RANGE: f64 = 4_294_967_296.0;

@inline
export function deterministicDirectionAngle(first: i32, second: i32): f64 {
  const hash = ((first + 1) * 73_856_093) ^ ((second + 1) * 19_349_663);
  return (<f64><u32>hash / UINT32_RANGE) * Math.PI * 2;
}

function setInitialPosition(index: i32): void {
  const positionRadius = initializationSpacing * Math.sqrt(0.5 + <f64>index);
  const angle = <f64>index * GOLDEN_ANGLE;
  setX(index, Math.cos(angle) * positionRadius);
  setY(index, Math.sin(angle) * positionRadius);
}

export function recoverFinitePosition(index: i32): void {
  if (
    isFiniteNumber(x(index))
    && isFiniteNumber(y(index))
    && isFiniteNumber(vx(index))
    && isFiniteNumber(vy(index))
  ) return;
  setInitialPosition(index);
  setVx(index, 0);
  setVy(index, 0);
}
