/// <reference lib="webworker" />

import type { GraphLayoutEngine } from '../physics/contracts';
import { createGraphLayoutEngine } from '../physics/engine';
import type {
  GraphLayoutWorkerCommand,
  GraphLayoutWorkerMessage,
  GraphLayoutWorkerTickMessage,
} from './protocol';

let engine: GraphLayoutEngine | undefined;
let mutationRevision = 0;
let revision = 0;

function requireEngine(): GraphLayoutEngine {
  if (!engine) throw new Error('Graph layout worker is not initialized');
  return engine;
}

function postTick(result: ReturnType<GraphLayoutEngine['tick']>): void {
  const current = requireEngine();
  const x = new Float32Array(current.x);
  const y = new Float32Array(current.y);
  const vx = new Float32Array(current.vx);
  const vy = new Float32Array(current.vy);
  const message: GraphLayoutWorkerTickMessage = {
    type: 'tick',
    mutationRevision,
    revision,
    result,
    x: x.buffer,
    y: y.buffer,
    vx: vx.buffer,
    vy: vy.buffer,
  };
  self.postMessage(message, { transfer: [x.buffer, y.buffer, vx.buffer, vy.buffer] });
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

const commandHandlers = {
  init: (command) => {
    revision = command.revision;
    mutationRevision = 0;
    engine = createGraphLayoutEngine(command.input);
  },
  tick: (command) => {
    if (command.revision === revision) postTick(requireEngine().tick(command.elapsedMs));
  },
  setConfig: (command) => {
    requireEngine().setConfig(command.config);
    setMutationRevision(command);
  },
  setKinematics: (command) => {
    requireEngine().setKinematics(
      new Float32Array(command.x),
      new Float32Array(command.y),
      new Float32Array(command.vx),
      new Float32Array(command.vy),
    );
    setMutationRevision(command);
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
    };
    self.postMessage(message);
  }
};
