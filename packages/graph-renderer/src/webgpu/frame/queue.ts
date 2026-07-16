const MAX_PENDING_FRAMES = 3;

export interface FrameSettlement {
  submissionId: number;
  succeeded: boolean;
}

export class FrameQueue {
  private pending = 0;
  private disposed = false;
  private nextSubmissionId = 1;

  constructor(
    private readonly device: GPUDevice,
    private readonly onFrameSettled: (settlement: FrameSettlement) => void,
  ) {}

  canSubmit(): boolean {
    return this.pending < MAX_PENDING_FRAMES && !this.disposed;
  }

  trackSubmission(): number {
    const submissionId = this.nextSubmissionId;
    this.nextSubmissionId += 1;
    this.pending += 1;
    void this.device.queue.onSubmittedWorkDone().then(
      () => this.complete(submissionId, true),
      () => this.complete(submissionId, false),
    );
    return submissionId;
  }

  dispose(): void {
    this.disposed = true;
  }

  private complete(submissionId: number, succeeded: boolean): void {
    if (this.disposed) return;
    this.pending = Math.max(0, this.pending - 1);
    this.onFrameSettled({ submissionId, succeeded });
  }
}
