let cellPointer: usize = 0;
let xPointer: usize = 0;
let yPointer: usize = 0;
let sizePointer: usize = 0;

export function initializeTraversal(
  nextCellPointer: usize,
  nextXPointer: usize,
  nextYPointer: usize,
  nextSizePointer: usize,
): void {
  cellPointer = nextCellPointer;
  xPointer = nextXPointer;
  yPointer = nextYPointer;
  sizePointer = nextSizePointer;
}

@inline
export function traversalCell(index: i32): i32 {
  return load<i32>(cellPointer + (<usize>index << 2));
}

@inline
export function setTraversalCell(index: i32, value: i32): void {
  store<i32>(cellPointer + (<usize>index << 2), value);
}

@inline
export function traversalX(index: i32): f64 {
  return load<f64>(xPointer + (<usize>index << 3));
}

@inline
export function setTraversalX(index: i32, value: f64): void {
  store<f64>(xPointer + (<usize>index << 3), value);
}

@inline
export function traversalY(index: i32): f64 {
  return load<f64>(yPointer + (<usize>index << 3));
}

@inline
export function setTraversalY(index: i32, value: f64): void {
  store<f64>(yPointer + (<usize>index << 3), value);
}

@inline
export function traversalSize(index: i32): f64 {
  return load<f64>(sizePointer + (<usize>index << 3));
}

@inline
export function setTraversalSize(index: i32, value: f64): void {
  store<f64>(sizePointer + (<usize>index << 3), value);
}
