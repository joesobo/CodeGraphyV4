import { describe, expect, it } from 'vitest';

import {
  createRenderedFrameRecorder,
  getRenderedFrameRecorder,
  MAX_RECORDED_FRAMES,
} from '../../../../src/webview/components/graph/debug/frameTimes';

describe('createRenderedFrameRecorder', () => {
  it('records only while explicitly armed and stops with an immutable snapshot', () => {
    const recorder = createRenderedFrameRecorder();

    recorder.record(1);
    recorder.start();
    recorder.record(10);
    recorder.record(26.7);
    const captured = recorder.stop();
    recorder.record(40);

    expect(captured).toEqual([10, 26.7]);
    expect(recorder.stop()).toEqual([10, 26.7]);
  });

  it('bounds instrumentation memory', () => {
    const recorder = createRenderedFrameRecorder();
    recorder.start();
    for (let index = 0; index < MAX_RECORDED_FRAMES + 100; index += 1) {
      recorder.record(index);
    }
    expect(recorder.stop()).toHaveLength(MAX_RECORDED_FRAMES);
  });

  it('retains one recorder across debug API reinstallations for the same window', () => {
    const win = {} as Window;
    expect(getRenderedFrameRecorder(win)).toBe(getRenderedFrameRecorder(win));
  });
});
