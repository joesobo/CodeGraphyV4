let dxValue: f64 = 0;
let dyValue: f64 = 0;
let distanceSquaredValue: f64 = 0;

export function forceDx(): f64 { return dxValue; }
export function forceDy(): f64 { return dyValue; }
export function forceDistanceSquared(): f64 { return distanceSquaredValue; }
export function setForceDx(value: f64): void { dxValue = value; }
export function setForceDy(value: f64): void { dyValue = value; }
export function setForceDistanceSquared(value: f64): void { distanceSquaredValue = value; }
