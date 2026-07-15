export const EMPTY_INDEX: i32 = -1;

let capacity: i32 = 0;
let cells: i32 = 0;
let visible: i32 = 0;
let rootCell: i32 = EMPTY_INDEX;
let didOverflow = false;

export function initializeTreeState(nextCapacity: i32): void { capacity = nextCapacity; }
export function cellCapacity(): i32 { return capacity; }
export function cellCount(): i32 { return cells; }
export function setCellCount(value: i32): void { cells = value; }
export function visibleNodeCount(): i32 { return visible; }
export function setVisibleNodeCount(value: i32): void { visible = value; }
export function root(): i32 { return rootCell; }
export function setRoot(value: i32): void { rootCell = value; }
export function overflowed(): bool { return didOverflow; }
export function setOverflowed(value: bool): void { didOverflow = value; }
