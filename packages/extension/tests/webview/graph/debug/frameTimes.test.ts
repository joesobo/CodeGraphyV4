import { describe, expect, it } from 'vitest';

import { createRenderedFrameRecorder } from '../../../../src/webview/components/graph/debug/frameTimes';

describe('createRenderedFrameRecorder', () => {
  it('records rendered frame timestamps until reset', () => {
    const recorder = createRenderedFrameRecorder();

    recorder.record(10);
    recorder.record(26.7);

    expect(recorder.read()).toEqual([10, 26.7]);
    recorder.clear();
    expect(recorder.read()).toEqual([]);
  });
});
