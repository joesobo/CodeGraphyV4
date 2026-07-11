export const MAX_RECORDED_FRAMES = 2_048;

export interface RenderedFrameRecorder {
  record(this: void, timestamp: number): void;
  start(this: void): void;
  stop(this: void): number[];
}

export function createRenderedFrameRecorder(): RenderedFrameRecorder {
  let armed = false;
  let timestamps: number[] = [];

  return {
    start: () => {
      timestamps = [];
      armed = true;
    },
    stop: () => {
      armed = false;
      return [...timestamps];
    },
    record: (timestamp: number) => {
      if (armed && timestamps.length < MAX_RECORDED_FRAMES) timestamps.push(timestamp);
    },
  };
}

const recorders = new WeakMap<Window, RenderedFrameRecorder>();

export function getRenderedFrameRecorder(win: Window): RenderedFrameRecorder {
  const existing = recorders.get(win);
  if (existing) return existing;
  const recorder = createRenderedFrameRecorder();
  recorders.set(win, recorder);
  return recorder;
}
