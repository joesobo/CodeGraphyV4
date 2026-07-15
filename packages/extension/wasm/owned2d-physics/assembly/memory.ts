export const PINNED_FLAG: u8 = 1;
export const HIDDEN_FLAG: u8 = 2;

export let nodeCount: i32 = 0;
export let edgeCount: i32 = 0;
export let xPointer: usize = 0;
export let yPointer: usize = 0;
export let vxPointer: usize = 0;
export let vyPointer: usize = 0;
export let multiplierPointer: usize = 0;
export let radiusPointer: usize = 0;
export let flagPointer: usize = 0;
export let edgeSourcePointer: usize = 0;
export let edgeTargetPointer: usize = 0;
export let linkDegreePointer: usize = 0;

export function initializeGraphMemory(
  nextNodeCount: i32,
  nextEdgeCount: i32,
  nextXPointer: usize,
  nextYPointer: usize,
  nextVxPointer: usize,
  nextVyPointer: usize,
  nextMultiplierPointer: usize,
  nextRadiusPointer: usize,
  nextFlagPointer: usize,
  nextEdgeSourcePointer: usize,
  nextEdgeTargetPointer: usize,
  nextLinkDegreePointer: usize,
): void {
  nodeCount = nextNodeCount;
  edgeCount = nextEdgeCount;
  xPointer = nextXPointer;
  yPointer = nextYPointer;
  vxPointer = nextVxPointer;
  vyPointer = nextVyPointer;
  multiplierPointer = nextMultiplierPointer;
  radiusPointer = nextRadiusPointer;
  flagPointer = nextFlagPointer;
  edgeSourcePointer = nextEdgeSourcePointer;
  edgeTargetPointer = nextEdgeTargetPointer;
  linkDegreePointer = nextLinkDegreePointer;
}

@inline
export function x(index: i32): f64 {
  return <f64>load<f32>(xPointer + (<usize>index << 2));
}

@inline
export function y(index: i32): f64 {
  return <f64>load<f32>(yPointer + (<usize>index << 2));
}

@inline
export function vx(index: i32): f64 {
  return <f64>load<f32>(vxPointer + (<usize>index << 2));
}

@inline
export function vy(index: i32): f64 {
  return <f64>load<f32>(vyPointer + (<usize>index << 2));
}

@inline
export function multiplier(index: i32): f64 {
  return <f64>load<f32>(multiplierPointer + (<usize>index << 2));
}

@inline
export function radius(index: i32): f64 {
  return <f64>load<f32>(radiusPointer + (<usize>index << 2));
}

@inline
export function flags(index: i32): u8 {
  return load<u8>(flagPointer + <usize>index);
}

@inline
export function edgeSource(index: i32): u32 {
  return load<u32>(edgeSourcePointer + (<usize>index << 2));
}

@inline
export function edgeTarget(index: i32): u32 {
  return load<u32>(edgeTargetPointer + (<usize>index << 2));
}

@inline
export function linkDegree(index: i32): u32 {
  return load<u32>(linkDegreePointer + (<usize>index << 2));
}

@inline
export function setX(index: i32, value: f64): void {
  store<f32>(xPointer + (<usize>index << 2), <f32>value);
}

@inline
export function setY(index: i32, value: f64): void {
  store<f32>(yPointer + (<usize>index << 2), <f32>value);
}

@inline
export function setVx(index: i32, value: f64): void {
  store<f32>(vxPointer + (<usize>index << 2), <f32>value);
}

@inline
export function setVy(index: i32, value: f64): void {
  store<f32>(vyPointer + (<usize>index << 2), <f32>value);
}

@inline
export function isHidden(index: i32): bool {
  return (flags(index) & HIDDEN_FLAG) != 0;
}

@inline
export function isPinned(index: i32): bool {
  return (flags(index) & PINNED_FLAG) != 0;
}

@inline
export function isFiniteNumber(value: f64): bool {
  return value > -Infinity && value < Infinity;
}
