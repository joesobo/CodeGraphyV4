import { OwnedGraphPerformanceMeasurements } from './measurements';
import { OwnedGraphPerformanceSubmissions } from './submissions';
import type {
  OwnedGraphFramePerformanceInput,
  OwnedGraphIdlePerformanceSample,
  OwnedGraphPerformanceMonitor,
  OwnedGraphPerformanceSample,
} from './types';

export type {
  OwnedGraphActivePerformanceSample,
  OwnedGraphFramePerformanceInput,
  OwnedGraphIdlePerformanceSample,
  OwnedGraphPerformanceMonitor,
  OwnedGraphPerformanceSample,
} from './types';

class OwnedGraphFpsMonitor implements OwnedGraphPerformanceMonitor {
  private readonly measurements = new OwnedGraphPerformanceMeasurements();
  private readonly submissions = new OwnedGraphPerformanceSubmissions(
    input => this.measurements.record(input),
  );

  completeFrame(submissionId: number): OwnedGraphPerformanceSample | undefined {
    return this.submissions.settle(submissionId, true);
  }

  discardFrame(submissionId: number): OwnedGraphPerformanceSample | undefined {
    return this.submissions.settle(submissionId, false);
  }

  reset(): void {
    this.measurements.reset();
    this.submissions.reset();
  }

  sample(): OwnedGraphPerformanceSample {
    return this.measurements.sample();
  }

  setIdle(): OwnedGraphIdlePerformanceSample {
    this.reset();
    return { status: 'idle' };
  }

  stageFrame(submissionId: number, input: OwnedGraphFramePerformanceInput): void {
    this.submissions.stage(submissionId, input);
  }
}

export function createOwnedGraphPerformanceMonitor(): OwnedGraphPerformanceMonitor {
  return new OwnedGraphFpsMonitor();
}
