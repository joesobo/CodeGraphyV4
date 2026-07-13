import {
  GraphNodeFlag,
  type GraphLayoutRenderSample,
} from '../physics/contracts';

const DEFAULT_SNAPSHOT_INTERVAL_MS = 1000 / 60;

export class GraphLayoutSnapshotInterpolator {
  private currentSnapshotAt = 0;
  private currentX: Float32Array;
  private currentY: Float32Array;
  private previousSnapshotAt = 0;
  private previousX: Float32Array;
  private previousY: Float32Array;
  private renderVersion = 0;
  private renderX: Float32Array;
  private renderY: Float32Array;
  private sampledProgress = -1;
  private sampledSnapshotVersion = -1;
  private snapshotVersion = 0;

  constructor(x: Float32Array, y: Float32Array, timestamp: number) {
    this.currentX = x;
    this.currentY = y;
    this.previousX = new Float32Array(x);
    this.previousY = new Float32Array(y);
    this.renderX = new Float32Array(x);
    this.renderY = new Float32Array(y);
    this.reset(x, y, timestamp);
  }

  accept(x: Float32Array, y: Float32Array, arrivedAt: number): void {
    const sampledCurrentSnapshot = this.sampledSnapshotVersion === this.snapshotVersion;
    this.previousX.set(sampledCurrentSnapshot ? this.renderX : this.currentX);
    this.previousY.set(sampledCurrentSnapshot ? this.renderY : this.currentY);
    this.previousSnapshotAt = this.snapshotVersion === 0
      ? arrivedAt - DEFAULT_SNAPSHOT_INTERVAL_MS
      : this.currentSnapshotAt;
    this.currentSnapshotAt = arrivedAt;
    this.currentX = x;
    this.currentY = y;
    this.snapshotVersion += 1;
    this.sampledSnapshotVersion = -1;
  }

  directPosition(index: number, x: number, y: number): void {
    this.previousX[index] = x;
    this.previousY[index] = y;
    this.renderX[index] = x;
    this.renderY[index] = y;
    this.renderVersion += 1;
  }

  authoritativeChanged(x: Float32Array, y: Float32Array): void {
    this.currentX = x;
    this.currentY = y;
    this.renderVersion += 1;
  }

  reset(x: Float32Array, y: Float32Array, timestamp: number): void {
    if (this.previousX.length !== x.length) {
      this.previousX = new Float32Array(x.length);
      this.previousY = new Float32Array(y.length);
      this.renderX = new Float32Array(x.length);
      this.renderY = new Float32Array(y.length);
    }
    this.currentX = x;
    this.currentY = y;
    this.previousX.set(x);
    this.previousY.set(y);
    this.renderX.set(x);
    this.renderY.set(y);
    this.previousSnapshotAt = timestamp - DEFAULT_SNAPSHOT_INTERVAL_MS;
    this.currentSnapshotAt = timestamp;
    this.sampledProgress = -1;
    this.sampledSnapshotVersion = -1;
    this.snapshotVersion = 0;
    this.renderVersion += 1;
  }

  sample(
    timestamp: number,
    flags: Uint8Array,
    failed: boolean,
  ): GraphLayoutRenderSample {
    if (failed || this.snapshotVersion === 0) {
      return {
        needsFrame: false,
        version: this.renderVersion,
        x: this.currentX,
        y: this.currentY,
      };
    }
    const interval = Math.max(
      DEFAULT_SNAPSHOT_INTERVAL_MS,
      this.currentSnapshotAt - this.previousSnapshotAt,
    );
    const progress = Math.min(1, Math.max(0, (timestamp - this.currentSnapshotAt) / interval));
    const changed = this.sampledSnapshotVersion !== this.snapshotVersion
      || this.sampledProgress !== progress;
    if (changed) {
      for (let index = 0; index < this.currentX.length; index += 1) {
        if ((flags[index] & GraphNodeFlag.Pinned) !== 0) {
          this.renderX[index] = this.currentX[index];
          this.renderY[index] = this.currentY[index];
        } else {
          this.renderX[index] = this.previousX[index]
            + (this.currentX[index] - this.previousX[index]) * progress;
          this.renderY[index] = this.previousY[index]
            + (this.currentY[index] - this.previousY[index]) * progress;
        }
      }
      this.sampledSnapshotVersion = this.snapshotVersion;
      this.sampledProgress = progress;
      this.renderVersion += 1;
    }
    return {
      needsFrame: progress < 1,
      version: this.renderVersion,
      x: this.renderX,
      y: this.renderY,
    };
  }
}
