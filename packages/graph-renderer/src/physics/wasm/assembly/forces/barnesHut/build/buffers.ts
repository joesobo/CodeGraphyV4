let stackPointer: usize = 0;
let traversalPointer: usize = 0;

export function initializeBuildBuffers(
  nextStackPointer: usize,
  nextTraversalPointer: usize,
): void {
  stackPointer = nextStackPointer;
  traversalPointer = nextTraversalPointer;
}

@inline
export function buildStack(index: i32): i32 {
  return load<i32>(stackPointer + (<usize>index << 2));
}

@inline
export function setBuildStack(index: i32, value: i32): void {
  store<i32>(stackPointer + (<usize>index << 2), value);
}

@inline
export function buildTraversal(index: i32): i32 {
  return load<i32>(traversalPointer + (<usize>index << 2));
}

@inline
export function setBuildTraversal(index: i32, value: i32): void {
  store<i32>(traversalPointer + (<usize>index << 2), value);
}
