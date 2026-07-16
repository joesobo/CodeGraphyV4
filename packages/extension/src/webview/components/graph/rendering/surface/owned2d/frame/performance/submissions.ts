import { validFramePerformanceInput } from './input';
import type {
  OwnedGraphFramePerformanceInput,
  OwnedGraphPerformanceSample,
} from './types';

interface PendingPerformanceFrame {
  input: OwnedGraphFramePerformanceInput | undefined;
  succeeded?: boolean;
}

export class OwnedGraphPerformanceSubmissions {
  private nextPendingSubmissionId: number | undefined;
  private readonly pendingFrames = new Map<number, PendingPerformanceFrame>();

  constructor(
    private readonly record: (
      input: OwnedGraphFramePerformanceInput,
    ) => OwnedGraphPerformanceSample | undefined,
  ) {}

  stage(submissionId: number, input: OwnedGraphFramePerformanceInput): void {
    if (!Number.isSafeInteger(submissionId) || submissionId <= 0) return;
    this.pendingFrames.set(submissionId, {
      input: validFramePerformanceInput(input) ? input : undefined,
    });
    this.nextPendingSubmissionId ??= submissionId;
  }

  settle(
    submissionId: number,
    succeeded: boolean,
  ): OwnedGraphPerformanceSample | undefined {
    const pending = this.pendingFrames.get(submissionId);
    if (!pending) return undefined;
    pending.succeeded = succeeded;
    return this.consumeSettledFrames();
  }

  reset(): void {
    this.nextPendingSubmissionId = undefined;
    this.pendingFrames.clear();
  }

  private consumeSettledFrames(): OwnedGraphPerformanceSample | undefined {
    let published: OwnedGraphPerformanceSample | undefined;
    while (this.nextPendingSubmissionId !== undefined) {
      const submissionId = this.nextPendingSubmissionId;
      const pending = this.pendingFrames.get(submissionId);
      if (!pending || pending.succeeded === undefined) break;
      this.pendingFrames.delete(submissionId);
      this.nextPendingSubmissionId = this.pendingFrames.size > 0
        ? submissionId + 1
        : undefined;
      if (pending.succeeded && pending.input) {
        published = this.record(pending.input) ?? published;
      }
    }
    return published;
  }
}
