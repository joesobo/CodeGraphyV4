import { describe, expect, it, vi } from 'vitest';
import { FrameQueue } from '../../../src/webgpu/frame/queue';

describe('FrameQueue', () => {
  it('releases submission slots when GPU completion rejects', async () => {
    let rejectCompletion: (reason: Error) => void = () => undefined;
    const completion = new Promise<void>((_resolve, reject) => {
      rejectCompletion = reject;
    });
    const onFrameComplete = vi.fn();
    const device = {
      queue: {
        onSubmittedWorkDone: vi.fn(() => completion),
      },
    } as unknown as GPUDevice;
    const queue = new FrameQueue(device, onFrameComplete);

    queue.trackSubmission();
    queue.trackSubmission();
    queue.trackSubmission();
    expect(queue.canSubmit()).toBe(false);

    rejectCompletion(new Error('device lost'));
    await expect(completion).rejects.toThrow('device lost');
    await Promise.resolve();

    expect(queue.canSubmit()).toBe(true);
    expect(onFrameComplete).toHaveBeenCalledTimes(3);
  });
});
