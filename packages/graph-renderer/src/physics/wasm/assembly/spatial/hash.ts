let keyPointer: usize = 0;
let headPointer: usize = 0;
let usedPointer: usize = 0;
let capacity: i32 = 0;
let mask: i32 = 0;

export function initializeSpatialHash(
  nextKeyPointer: usize,
  nextHeadPointer: usize,
  nextUsedPointer: usize,
  nextCapacity: i32,
): void {
  keyPointer = nextKeyPointer;
  headPointer = nextHeadPointer;
  usedPointer = nextUsedPointer;
  capacity = nextCapacity;
  mask = nextCapacity - 1;
}

function findSlot(hashKey: i32): i32 {
  let slot = <i32>(<u32>hashKey & <u32>mask);
  for (let probe = 0; probe < capacity; probe += 1) {
    if (load<u8>(usedPointer + <usize>slot) == 0) return slot;
    if (load<i32>(keyPointer + (<usize>slot << 2)) == hashKey) return slot;
    slot = (slot + 1) & mask;
  }
  return -1;
}

@inline
export function spatialKey(cellX: i32, cellY: i32): i32 {
  return (cellX * 73_856_093) ^ (cellY * 19_349_663);
}

export function clearSpatialHash(): void {
  memory.fill(usedPointer, 0, <usize>capacity);
}

export function spatialHashHead(hashKey: i32): i32 {
  const slot = findSlot(hashKey);
  return slot < 0 || load<u8>(usedPointer + <usize>slot) == 0
    ? -1
    : load<i32>(headPointer + (<usize>slot << 2));
}

export function prependSpatialHashHead(hashKey: i32, head: i32): i32 {
  const slot = findSlot(hashKey);
  if (slot < 0) return -1;
  const previousHead = load<u8>(usedPointer + <usize>slot) == 0
    ? -1
    : load<i32>(headPointer + (<usize>slot << 2));
  store<u8>(usedPointer + <usize>slot, 1);
  store<i32>(keyPointer + (<usize>slot << 2), hashKey);
  store<i32>(headPointer + (<usize>slot << 2), head);
  return previousHead;
}
