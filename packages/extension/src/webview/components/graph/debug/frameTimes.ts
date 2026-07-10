export interface RenderedFrameRecorder {
  clear(this: void): void;
  read(this: void): number[];
  record(this: void, timestamp: number): void;
}

export function createRenderedFrameRecorder(): RenderedFrameRecorder {
  let timestamps: number[] = [];

  return {
    clear: () => {
      timestamps = [];
    },
    read: () => [...timestamps],
    record: (timestamp: number) => {
      timestamps.push(timestamp);
    },
  };
}
