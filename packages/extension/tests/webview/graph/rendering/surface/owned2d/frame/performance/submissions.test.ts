import { describe, expect, it, vi } from 'vitest';
import { OwnedGraphPerformanceSubmissions } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/performance/submissions';

const frame = {
  presentationTimestampMs: 0,
  renderMs: 1,
  simulationMs: 1,
};

describe('owned graph performance submissions', () => {
  it.each([0, -1, 1.5, Number.NaN])('rejects invalid submission id %s', submissionId => {
    const record = vi.fn(() => ({ status: 'idle' as const }));
    const submissions = new OwnedGraphPerformanceSubmissions(record);

    submissions.stage(submissionId, frame);

    expect(submissions.settle(submissionId, true)).toBeUndefined();
    expect(record).not.toHaveBeenCalled();
  });

  it('ignores an unknown valid submission id', () => {
    const record = vi.fn();
    const submissions = new OwnedGraphPerformanceSubmissions(record);

    expect(submissions.settle(1, true)).toBeUndefined();
    expect(record).not.toHaveBeenCalled();
  });

  it('clears queued and out-of-order submissions on reset', () => {
    const record = vi.fn();
    const submissions = new OwnedGraphPerformanceSubmissions(record);
    submissions.stage(1, frame);
    submissions.stage(2, frame);
    expect(submissions.settle(2, true)).toBeUndefined();

    submissions.reset();

    expect(submissions.settle(1, true)).toBeUndefined();
    expect(submissions.settle(2, true)).toBeUndefined();
    expect(record).not.toHaveBeenCalled();
  });
});
