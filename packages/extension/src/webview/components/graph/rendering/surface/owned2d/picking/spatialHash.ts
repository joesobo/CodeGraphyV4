export function ownedGraphSpatialCellKey(x: number, y: number): number {
  return Math.imul(x, 73_856_093) ^ Math.imul(y, 19_349_663);
}
