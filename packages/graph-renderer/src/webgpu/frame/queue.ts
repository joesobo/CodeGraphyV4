const MAX_PENDING_FRAMES = 3;

export class FrameQueue {
  private pending = 0;
  private disposed = false;

  constructor(
    private readonly device: GPUDevice,
    private readonly onFrameComplete: () => void,
  ) {}

  canSubmit(): boolean {
    return this.pending < MAX_PENDING_FRAMES && !this.disposed;
  }

  trackSubmission(): void {
    this.pending += 1;
    void this.device.queue.onSubmittedWorkDone()
      .then(() => this.complete())
      .catch(() => {
        // Device loss is reported by device.lost and handled by the consumer.
      });
  }

  dispose(): void {
    this.disposed = true;
  }

  private complete(): void {
    if (this.disposed) return;
    this.pending = Math.max(0, this.pending - 1);
    this.onFrameComplete();
  }
}
