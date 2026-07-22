const MAX_PENDING_FRAMES = 3;

export interface FrameSettlement {
  error: GPUError | null;
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

  trackSubmission(frameError: Promise<GPUError | null> = Promise.resolve(null)): number {
    const submissionId = this.nextSubmissionId;
    this.nextSubmissionId += 1;
    this.pending += 1;
    void Promise.all([this.device.queue.onSubmittedWorkDone(), frameError]).then(
      ([, error]) => this.complete(submissionId, error === null, error),
      () => this.complete(submissionId, false, null),
    );
    return submissionId;
  }

  dispose(): void {
    this.disposed = true;
  }

  private complete(submissionId: number, succeeded: boolean, error: GPUError | null): void {
    if (this.disposed) return;
    this.pending = Math.max(0, this.pending - 1);
    this.onFrameSettled({ error, submissionId, succeeded });
  }
}
