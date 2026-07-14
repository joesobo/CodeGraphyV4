const DEFAULT_RECORDING_CAPACITY = 8_192;

export type OwnedGraphInteractionPhase = 'down' | 'move' | 'up';

export interface OwnedGraphInteractionRecordingOptions {
  neighborNodeIds: readonly string[];
  targetNodeId: string;
}

export interface OwnedGraphInteractionInput {
  eventTimestampMs: number;
  nodeId: string | null;
  phase: OwnedGraphInteractionPhase;
  targetX: number;
  targetY: number;
}

export interface OwnedGraphRecordedInteractionInput extends OwnedGraphInteractionInput {
  sequence: number;
}

export interface OwnedGraphRecordedPosition {
  id: string;
  x: number;
  y: number;
}

export interface OwnedGraphInteractionFrameInput {
  alpha: number;
  nodeIds: readonly string[];
  presentationTimestampMs: number;
  renderMs: number;
  renderedX: Float32Array;
  renderedY: Float32Array;
  settled: boolean;
  simulationMs: number;
  steps: number;
  vx: Float32Array;
  vy: Float32Array;
}

export interface OwnedGraphRecordedInteractionFrame {
  alpha: number;
  kineticEnergy: number;
  latestInputSequence: number | null;
  neighbors: OwnedGraphRecordedPosition[];
  presentationTimestampMs: number;
  renderMs: number;
  settled: boolean;
  simulationMs: number;
  steps: number;
  target: OwnedGraphRecordedPosition | null;
  totalCpuMs: number;
}

export interface OwnedGraphInteractionRecording {
  frames: OwnedGraphRecordedInteractionFrame[];
  inputs: OwnedGraphRecordedInteractionInput[];
  neighborNodeIds: string[];
  targetNodeId: string;
  truncated: boolean;
}

export interface OwnedGraphInteractionRecorder {
  readonly active: boolean;
  recordFrame(input: OwnedGraphInteractionFrameInput): void;
  recordInput(input: OwnedGraphInteractionInput): void;
  start(options: OwnedGraphInteractionRecordingOptions): void;
  stop(): OwnedGraphInteractionRecording | null;
}

export interface OwnedGraphInteractionRecorderOptions {
  capacity?: number;
}

function recordingCapacity(value: number | undefined): number {
  return Number.isInteger(value) && (value as number) > 0
    ? value as number
    : DEFAULT_RECORDING_CAPACITY;
}

function clonePosition(position: OwnedGraphRecordedPosition): OwnedGraphRecordedPosition {
  return { ...position };
}

function cloneRecording(
  recording: OwnedGraphInteractionRecording,
): OwnedGraphInteractionRecording {
  return {
    frames: recording.frames.map(frame => ({
      ...frame,
      neighbors: frame.neighbors.map(clonePosition),
      target: frame.target ? clonePosition(frame.target) : null,
    })),
    inputs: recording.inputs.map(input => ({ ...input })),
    neighborNodeIds: [...recording.neighborNodeIds],
    targetNodeId: recording.targetNodeId,
    truncated: recording.truncated,
  };
}

function finitePosition(
  id: string,
  index: number | undefined,
  x: Float32Array,
  y: Float32Array,
): OwnedGraphRecordedPosition | null {
  if (index === undefined) return null;
  const positionX = x[index];
  const positionY = y[index];
  return Number.isFinite(positionX) && Number.isFinite(positionY)
    ? { id, x: positionX, y: positionY }
    : null;
}

export function createOwnedGraphInteractionRecorder(
  options: OwnedGraphInteractionRecorderOptions = {},
): OwnedGraphInteractionRecorder {
  const capacity = recordingCapacity(options.capacity);
  let recording: OwnedGraphInteractionRecording | null = null;
  let cachedNodeIds: readonly string[] | null = null;
  let targetIndex: number | undefined;
  let neighborIndexes: Array<{ id: string; index: number | undefined }> = [];
  let inputSequence = 0;
  let latestInputSequence: number | null = null;

  function refreshIndexes(nodeIds: readonly string[]): void {
    if (!recording || cachedNodeIds === nodeIds) return;
    cachedNodeIds = nodeIds;
    const indexes = new Map(nodeIds.map((id, index) => [id, index]));
    targetIndex = indexes.get(recording.targetNodeId);
    neighborIndexes = recording.neighborNodeIds.map(id => ({ id, index: indexes.get(id) }));
  }

  return {
    get active(): boolean {
      return recording !== null;
    },
    recordFrame: (input) => {
      if (!recording) return;
      if (recording.frames.length >= capacity) {
        recording.truncated = true;
        return;
      }
      refreshIndexes(input.nodeIds);
      const neighbors = neighborIndexes
        .map(({ id, index }) => finitePosition(id, index, input.renderedX, input.renderedY))
        .filter((position): position is OwnedGraphRecordedPosition => position !== null);
      let kineticEnergy = 0;
      const velocityCount = Math.min(input.vx.length, input.vy.length);
      for (let index = 0; index < velocityCount; index += 1) {
        const vx = input.vx[index];
        const vy = input.vy[index];
        if (Number.isFinite(vx) && Number.isFinite(vy)) {
          kineticEnergy += vx * vx + vy * vy;
        }
      }
      recording.frames.push({
        alpha: input.alpha,
        kineticEnergy,
        latestInputSequence,
        neighbors,
        presentationTimestampMs: input.presentationTimestampMs,
        renderMs: input.renderMs,
        settled: input.settled,
        simulationMs: input.simulationMs,
        steps: input.steps,
        target: finitePosition(
          recording.targetNodeId,
          targetIndex,
          input.renderedX,
          input.renderedY,
        ),
        totalCpuMs: input.simulationMs + input.renderMs,
      });
    },
    recordInput: (input) => {
      if (!recording || input.nodeId !== recording.targetNodeId) return;
      if (recording.inputs.length >= capacity) {
        recording.truncated = true;
        return;
      }
      latestInputSequence = inputSequence;
      recording.inputs.push({ ...input, sequence: latestInputSequence });
      inputSequence += 1;
    },
    start: (recordingOptions) => {
      recording = {
        frames: [],
        inputs: [],
        neighborNodeIds: [...recordingOptions.neighborNodeIds],
        targetNodeId: recordingOptions.targetNodeId,
        truncated: false,
      };
      cachedNodeIds = null;
      targetIndex = undefined;
      neighborIndexes = [];
      inputSequence = 0;
      latestInputSequence = null;
    },
    stop: () => {
      if (!recording) return null;
      const result = cloneRecording(recording);
      recording = null;
      cachedNodeIds = null;
      latestInputSequence = null;
      return result;
    },
  };
}
