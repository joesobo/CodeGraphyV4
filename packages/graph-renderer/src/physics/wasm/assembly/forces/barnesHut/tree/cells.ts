let childrenPointer: usize = 0;
let internalPointer: usize = 0;
let leafHeadPointer: usize = 0;
let nextCoincidentPointer: usize = 0;

export function initializeCells(
  nextChildrenPointer: usize,
  nextInternalPointer: usize,
  nextLeafHeadPointer: usize,
  nextCoincidentNodePointer: usize,
): void {
  childrenPointer = nextChildrenPointer;
  internalPointer = nextInternalPointer;
  leafHeadPointer = nextLeafHeadPointer;
  nextCoincidentPointer = nextCoincidentNodePointer;
}

@inline
export function child(cell: i32, quadrant: i32): i32 {
  return load<i32>(childrenPointer + (<usize>(cell * 4 + quadrant) << 2));
}

@inline
export function setChild(cell: i32, quadrant: i32, value: i32): void {
  store<i32>(childrenPointer + (<usize>(cell * 4 + quadrant) << 2), value);
}

@inline
export function internal(cell: i32): bool {
  return load<u8>(internalPointer + <usize>cell) != 0;
}

@inline
export function setInternal(cell: i32, value: bool): void {
  store<u8>(internalPointer + <usize>cell, value ? 1 : 0);
}

@inline
export function leafHead(cell: i32): i32 {
  return load<i32>(leafHeadPointer + (<usize>cell << 2));
}

@inline
export function setLeafHead(cell: i32, value: i32): void {
  store<i32>(leafHeadPointer + (<usize>cell << 2), value);
}

@inline
export function nextCoincident(node: i32): i32 {
  return load<i32>(nextCoincidentPointer + (<usize>node << 2));
}

@inline
export function setNextCoincident(node: i32, value: i32): void {
  store<i32>(nextCoincidentPointer + (<usize>node << 2), value);
}

export function clearChildren(cell: i32): void {
  memory.fill(childrenPointer + <usize>(cell * 16), 0xff, 16);
}
