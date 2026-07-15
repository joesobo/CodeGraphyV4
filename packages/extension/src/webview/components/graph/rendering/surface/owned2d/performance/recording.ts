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

function kineticEnergy(vxValues: Float32Array, vyValues: Float32Array): number {
  let energy = 0;
  const velocityCount = Math.min(vxValues.length, vyValues.length);
  for (let index = 0; index < velocityCount; index += 1) {
    const vx = vxValues[index];
    const vy = vyValues[index];
    if (Number.isFinite(vx) && Number.isFinite(vy)) energy += vx * vx + vy * vy;
  }
  return energy;
}

class BoundedOwnedGraphInteractionRecorder implements OwnedGraphInteractionRecorder {
  private readonly capacity: number;
  private cachedNodeIds: readonly string[] | null = null;
  private inputSequence = 0;
  private latestInputSequence: number | null = null;
  private neighborIndexes: Array<{ id: string; index: number | undefined }> = [];
  private recording: OwnedGraphInteractionRecording | null = null;
  private targetIndex: number | undefined;

  constructor(options: OwnedGraphInteractionRecorderOptions) {
    this.capacity = recordingCapacity(options.capacity);
  }

  recordFrame(input: OwnedGraphInteractionFrameInput): void {
    if (!this.recording) return;
    if (this.recording.frames.length >= this.capacity) {
      this.recording.truncated = true;
      return;
    }
    this.refreshIndexes(input.nodeIds);
    this.recording.frames.push({
      alpha: input.alpha,
      kineticEnergy: kineticEnergy(input.vx, input.vy),
      latestInputSequence: this.latestInputSequence,
      neighbors: this.neighborPositions(input.renderedX, input.renderedY),
      presentationTimestampMs: input.presentationTimestampMs,
      renderMs: input.renderMs,
      settled: input.settled,
      simulationMs: input.simulationMs,
      steps: input.steps,
      target: finitePosition(
        this.recording.targetNodeId,
        this.targetIndex,
        input.renderedX,
        input.renderedY,
      ),
      totalCpuMs: input.simulationMs + input.renderMs,
    });
  }

  recordInput(input: OwnedGraphInteractionInput): void {
    if (!this.recording || input.nodeId !== this.recording.targetNodeId) return;
    if (this.recording.inputs.length >= this.capacity) {
      this.recording.truncated = true;
      return;
    }
    this.latestInputSequence = this.inputSequence;
    this.recording.inputs.push({ ...input, sequence: this.latestInputSequence });
    this.inputSequence += 1;
  }

  start(options: OwnedGraphInteractionRecordingOptions): void {
    this.recording = {
      frames: [],
      inputs: [],
      neighborNodeIds: [...options.neighborNodeIds],
      targetNodeId: options.targetNodeId,
      truncated: false,
    };
    this.cachedNodeIds = null;
    this.targetIndex = undefined;
    this.neighborIndexes = [];
    this.inputSequence = 0;
    this.latestInputSequence = null;
  }

  stop(): OwnedGraphInteractionRecording | null {
    if (!this.recording) return null;
    const result = this.recording;
    this.recording = null;
    this.cachedNodeIds = null;
    this.latestInputSequence = null;
    return result;
  }

  private neighborPositions(
    x: Float32Array,
    y: Float32Array,
  ): OwnedGraphRecordedPosition[] {
    return this.neighborIndexes
      .map(({ id, index }) => finitePosition(id, index, x, y))
      .filter((position): position is OwnedGraphRecordedPosition => position !== null);
  }

  private refreshIndexes(nodeIds: readonly string[]): void {
    if (!this.recording || this.cachedNodeIds === nodeIds) return;
    this.cachedNodeIds = nodeIds;
    const indexes = new Map(nodeIds.map((id, index) => [id, index]));
    this.targetIndex = indexes.get(this.recording.targetNodeId);
    this.neighborIndexes = this.recording.neighborNodeIds
      .map(id => ({ id, index: indexes.get(id) }));
  }
}

export function createOwnedGraphInteractionRecorder(
  options: OwnedGraphInteractionRecorderOptions = {},
): OwnedGraphInteractionRecorder {
  return new BoundedOwnedGraphInteractionRecorder(options);
}
