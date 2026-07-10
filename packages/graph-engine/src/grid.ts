export class UniformGrid {
  readonly cellSize: number;
  private heads = new Map<number, number>();
  private next = new Int32Array();
  private cellX = new Int32Array();
  private cellY = new Int32Array();

  constructor(cellSize: number) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new Error('Grid cell size must be positive');
    }
    this.cellSize = cellSize;
  }

  rebuild(
    x: Float32Array,
    y: Float32Array,
    flags: Uint8Array,
    hiddenMask: number,
  ): void {
    if (x.length !== y.length || x.length !== flags.length) {
      throw new Error('Grid buffers must have equal lengths');
    }
    if (this.next.length !== x.length) {
      this.next = new Int32Array(x.length);
      this.cellX = new Int32Array(x.length);
      this.cellY = new Int32Array(x.length);
    }
    this.next.fill(-1);
    this.heads.clear();

    for (let index = 0; index < x.length; index += 1) {
      if ((flags[index] & hiddenMask) !== 0) continue;
      const cellX = Math.floor(x[index] / this.cellSize);
      const cellY = Math.floor(y[index] / this.cellSize);
      this.cellX[index] = cellX;
      this.cellY[index] = cellY;
      const key = this.key(cellX, cellY);
      this.next[index] = this.heads.get(key) ?? -1;
      this.heads.set(key, index);
    }
  }

  forEachNearby(
    index: number,
    maximumNeighbors: number,
    visit: (otherIndex: number) => void,
  ): void {
    let visited = 0;
    const centerX = this.cellX[index];
    const centerY = this.cellY[index];

    for (let yOffset = -1; yOffset <= 1 && visited < maximumNeighbors; yOffset += 1) {
      for (let xOffset = -1; xOffset <= 1 && visited < maximumNeighbors; xOffset += 1) {
        const targetX = centerX + xOffset;
        const targetY = centerY + yOffset;
        let otherIndex = this.heads.get(this.key(targetX, targetY)) ?? -1;
        while (otherIndex >= 0 && visited < maximumNeighbors) {
          if (
            otherIndex !== index
            && this.cellX[otherIndex] === targetX
            && this.cellY[otherIndex] === targetY
          ) {
            visit(otherIndex);
            visited += 1;
          }
          otherIndex = this.next[otherIndex];
        }
      }
    }
  }

  private key(cellX: number, cellY: number): number {
    return Math.imul(cellX, 73_856_093) ^ Math.imul(cellY, 19_349_663);
  }
}
