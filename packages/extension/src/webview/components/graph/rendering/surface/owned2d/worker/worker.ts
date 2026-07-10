/// <reference lib="webworker" />

import { createGraphLayoutEngine, type GraphLayoutEngine } from '@codegraphy-dev/graph-engine';
import type {
  GraphLayoutWorkerCommand,
  GraphLayoutWorkerMessage,
  GraphLayoutWorkerTickMessage,
} from './protocol';

let engine: GraphLayoutEngine | undefined;

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
      engine = createGraphLayoutEngine(command.input);
      break;
    case 'tick':
      postTick(requireEngine().tick(command.elapsedMs));
      break;
    case 'setConfig':
      requireEngine().setConfig(command.config);
      break;
    case 'setNodePosition':
      requireEngine().setNodePosition(command.index, command.x, command.y);
      break;
    case 'pin':
      requireEngine().pin(command.index);
      break;
    case 'release':
      requireEngine().release(command.index);
      break;
    case 'setHidden':
      requireEngine().setHidden(command.index, command.hidden);
      break;
    case 'reheat':
      requireEngine().reheat(command.alpha);
      break;
    case 'pause':
      requireEngine().pause();
      break;
    case 'resume':
      requireEngine().resume();
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
