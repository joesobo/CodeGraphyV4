const SAMPLE_CAPACITY = 120;

export class RollingPerformanceAverage {
  private sampleCount = 0;
  private nextIndex = 0;
  private readonly values = new Float64Array(SAMPLE_CAPACITY);

  get count(): number {
    return this.sampleCount;
  }

  add(value: number): void {
    this.values[this.nextIndex] = value;
    this.nextIndex = (this.nextIndex + 1) % SAMPLE_CAPACITY;
    this.sampleCount = Math.min(this.sampleCount + 1, SAMPLE_CAPACITY);
  }

  average(): number {
    let total = 0;
    for (let index = 0; index < this.sampleCount; index += 1) total += this.values[index];
    return total / this.sampleCount;
  }

  reset(): void {
    this.sampleCount = 0;
    this.nextIndex = 0;
  }
}
