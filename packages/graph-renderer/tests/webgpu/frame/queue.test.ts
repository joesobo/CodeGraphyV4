import { describe, expect, it, vi } from 'vitest';
import { FrameQueue, type FrameSettlement } from '../../../src/webgpu/frame/queue';

interface DeferredCompletion {
  promise: Promise<void>;
  reject(error: Error): void;
  resolve(): void;
}

function deferredCompletion(): DeferredCompletion {
  let reject!: (error: Error) => void;
  let resolve!: () => void;
  const promise = new Promise<void>((resolveCompletion, rejectCompletion) => {
    resolve = resolveCompletion;
    reject = rejectCompletion;
  });
  return { promise, reject, resolve };
}

function queueHarness() {
  const completions: DeferredCompletion[] = [];
  const device = {
    queue: {
      onSubmittedWorkDone: vi.fn(() => {
        const completion = deferredCompletion();
        completions.push(completion);
        return completion.promise;
      }),
    },
  } as unknown as GPUDevice;
  return { completions, device };
}

async function flushCompletion(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('FrameQueue', () => {
  it('assigns stable submission identities and reports success separately from rejection', async () => {
    const harness = queueHarness();
    const settlements: FrameSettlement[] = [];
    const queue = new FrameQueue(harness.device, settlement => settlements.push(settlement));

    expect(queue.trackSubmission()).toBe(1);
    expect(queue.trackSubmission()).toBe(2);
    expect(queue.trackSubmission()).toBe(3);
    expect(queue.canSubmit()).toBe(false);

    harness.completions[0].reject(new Error('device lost'));
    harness.completions[1].resolve();
    harness.completions[2].reject(new Error('device lost'));
    await flushCompletion();

    expect(queue.canSubmit()).toBe(true);
    expect(settlements).toEqual([
      { error: null, submissionId: 1, succeeded: false },
      { error: null, submissionId: 2, succeeded: true },
      { error: null, submissionId: 3, succeeded: false },
    ]);
  });

  it('preserves submission identity when GPU promises settle in a different order', async () => {
    const harness = queueHarness();
    const onFrameSettled = vi.fn();
    const queue = new FrameQueue(harness.device, onFrameSettled);

    queue.trackSubmission();
    queue.trackSubmission();
    harness.completions[1].resolve();
    await flushCompletion();
    harness.completions[0].reject(new Error('lost'));
    await flushCompletion();

    expect(onFrameSettled).toHaveBeenNthCalledWith(1, {
      error: null,
      submissionId: 2,
      succeeded: true,
    });
    expect(onFrameSettled).toHaveBeenNthCalledWith(2, {
      error: null,
      submissionId: 1,
      succeeded: false,
    });
  });

  it('does not report success until frame validation settles', async () => {
    const harness = queueHarness();
    const onFrameSettled = vi.fn();
    const queue = new FrameQueue(harness.device, onFrameSettled);
    let resolveValidation!: (error: GPUError | null) => void;
    const validation = new Promise<GPUError | null>(resolve => {
      resolveValidation = resolve;
    });

    queue.trackSubmission(validation);
    harness.completions[0].resolve();
    await flushCompletion();
    expect(onFrameSettled).not.toHaveBeenCalled();

    const error = { message: 'frame validation failed' } as GPUError;
    resolveValidation(error);
    await flushCompletion();

    expect(onFrameSettled).toHaveBeenCalledWith({
      error,
      submissionId: 1,
      succeeded: false,
    });
  });

  it('does not report settlement after disposal', async () => {
    const harness = queueHarness();
    const onFrameSettled = vi.fn();
    const queue = new FrameQueue(harness.device, onFrameSettled);

    queue.trackSubmission();
    queue.dispose();
    harness.completions[0].resolve();
    await flushCompletion();

    expect(queue.canSubmit()).toBe(false);
    expect(onFrameSettled).not.toHaveBeenCalled();
  });
});
