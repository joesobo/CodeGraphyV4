/// <reference lib="webworker" />

import { createGraphLayoutEngine, type GraphLayoutEngine } from '../physics';
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

function handleCommand(command: GraphLayoutWorkerCommand): void {
  switch (command.type) {
    case 'init':
      revision = command.revision;
      mutationRevision = 0;
      engine = createGraphLayoutEngine(command.input);
      break;
    case 'tick':
      if (command.revision === revision) postTick(requireEngine().tick(command.elapsedMs));
      break;
    case 'setConfig':
      requireEngine().setConfig(command.config);
      mutationRevision = command.mutationRevision;
      break;
    case 'setKinematics':
      requireEngine().setKinematics(
        new Float32Array(command.x),
        new Float32Array(command.y),
        new Float32Array(command.vx),
        new Float32Array(command.vy),
      );
      mutationRevision = command.mutationRevision;
      break;
    case 'setNodePosition':
      requireEngine().setNodePosition(command.index, command.x, command.y);
      mutationRevision = command.mutationRevision;
      break;
    case 'pin':
      requireEngine().pin(command.index);
      mutationRevision = command.mutationRevision;
      break;
    case 'release':
      requireEngine().release(command.index);
      mutationRevision = command.mutationRevision;
      break;
    case 'setHidden':
      requireEngine().setHidden(command.index, command.hidden);
      mutationRevision = command.mutationRevision;
      break;
    case 'reheat':
      requireEngine().reheat(command.alpha);
      mutationRevision = command.mutationRevision;
      break;
    case 'pause':
      requireEngine().pause();
      mutationRevision = command.mutationRevision;
      break;
    case 'resume':
      requireEngine().resume();
      mutationRevision = command.mutationRevision;
      break;
  }
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
