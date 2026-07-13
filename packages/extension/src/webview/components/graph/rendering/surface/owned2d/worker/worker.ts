/// <reference lib="webworker" />

import type { GraphLayoutEngine } from '../physics/contracts';
import { createGraphLayoutEngine } from '../physics/engine';
import type {
  GraphLayoutWorkerCommand,
  GraphLayoutTransferBuffers,
  GraphLayoutWorkerMessage,
  GraphLayoutWorkerTickMessage,
} from './protocol';
import { transferBufferList } from './protocol';

let engine: GraphLayoutEngine | undefined;
let mutationRevision = 0;
let revision = 0;
let structuralRevision = 0;
let availableOutputBuffers: GraphLayoutTransferBuffers[] = [];

function requireEngine(): GraphLayoutEngine {
  if (!engine) throw new Error('Graph layout worker is not initialized');
  return engine;
}

function postTick(result: ReturnType<GraphLayoutEngine['tick']>): void {
  const current = requireEngine();
  const buffers = availableOutputBuffers.shift();
  if (!buffers) throw new Error('Graph layout worker has no available output buffers');
  new Float32Array(buffers.x).set(current.x);
  new Float32Array(buffers.y).set(current.y);
  new Float32Array(buffers.vx).set(current.vx);
  new Float32Array(buffers.vy).set(current.vy);
  const message: GraphLayoutWorkerTickMessage = {
    alpha: current.alpha,
    buffers,
    type: 'tick',
    mutationRevision,
    revision,
    structuralRevision,
    result,
  };
  self.postMessage(message, { transfer: transferBufferList(buffers) });
}

type WorkerCommandType = GraphLayoutWorkerCommand['type'];
type WorkerCommandOfType<Type extends WorkerCommandType> = Extract<
  GraphLayoutWorkerCommand,
  { type: Type }
>;
type WorkerCommandHandlers = {
  [Type in WorkerCommandType]: (command: WorkerCommandOfType<Type>) => void;
};

function setMutationRevision(command: { mutationRevision: number }): void {
  mutationRevision = command.mutationRevision;
}

function setStructuralRevision(command: {
  mutationRevision: number;
  structuralRevision: number;
}): void {
  setMutationRevision(command);
  structuralRevision = command.structuralRevision;
}

const commandHandlers = {
  init: (command) => {
    revision = command.revision;
    mutationRevision = 0;
    structuralRevision = 0;
    engine = createGraphLayoutEngine(command.input);
    availableOutputBuffers = [...command.outputBuffers];
  },
  tick: (command) => {
    if (command.revision !== revision) return;
    if (command.recycledBuffers) availableOutputBuffers.push(...command.recycledBuffers);
    postTick(requireEngine().tick());
  },
  setConfig: (command) => {
    requireEngine().setConfig(command.config);
    setStructuralRevision(command);
  },
  setKinematics: (command) => {
    requireEngine().setKinematics(
      new Float32Array(command.buffers.x),
      new Float32Array(command.buffers.y),
      new Float32Array(command.buffers.vx),
      new Float32Array(command.buffers.vy),
    );
    setMutationRevision(command);
    self.postMessage({
      buffers: command.buffers,
      revision: command.revision,
      type: 'kinematicsBuffers',
    }, { transfer: transferBufferList(command.buffers) });
  },
  setNodePosition: (command) => {
    requireEngine().setNodePosition(command.index, command.x, command.y);
    setMutationRevision(command);
  },
  pin: (command) => {
    requireEngine().pin(command.index);
    setMutationRevision(command);
  },
  release: (command) => {
    requireEngine().release(command.index);
    setMutationRevision(command);
  },
  setHidden: (command) => {
    requireEngine().setHidden(command.index, command.hidden);
    setStructuralRevision(command);
  },
  setAlpha: (command) => {
    requireEngine().setAlpha(command.alpha);
    setMutationRevision(command);
  },
  setAlphaTarget: (command) => {
    requireEngine().setAlphaTarget(command.alpha);
    setMutationRevision(command);
  },
  reheat: (command) => {
    requireEngine().reheat(command.alpha);
    setMutationRevision(command);
  },
  pause: (command) => {
    requireEngine().pause();
    setMutationRevision(command);
  },
  resume: (command) => {
    requireEngine().resume();
    setMutationRevision(command);
  },
} satisfies WorkerCommandHandlers;

function handleCommand(command: GraphLayoutWorkerCommand): void {
  const handler = commandHandlers[command.type] as (
    value: GraphLayoutWorkerCommand,
  ) => void;
  handler(command);
}

self.onmessage = (event: MessageEvent<GraphLayoutWorkerCommand>) => {
  try {
    handleCommand(event.data);
  } catch (error) {
    const message: GraphLayoutWorkerMessage = {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      revision,
    };
    self.postMessage(message);
  }
};
