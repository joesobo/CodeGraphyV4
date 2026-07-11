import type { GraphLayoutConfig, GraphLayoutInput, GraphLayoutTickResult } from '../physics';

export type GraphLayoutWorkerCommand =
  | { type: 'init'; input: GraphLayoutInput }
  | { type: 'tick'; elapsedMs: number }
  | { type: 'setConfig'; config: Partial<GraphLayoutConfig> }
  | { type: 'setNodePosition'; index: number; x: number; y: number }
  | { type: 'pin'; index: number }
  | { type: 'release'; index: number }
  | { type: 'setHidden'; index: number; hidden: boolean }
  | { type: 'reheat'; alpha?: number }
  | { type: 'pause' }
  | { type: 'resume' };

export interface GraphLayoutWorkerTickMessage {
  type: 'tick';
  result: GraphLayoutTickResult;
  x: ArrayBuffer;
  y: ArrayBuffer;
  vx: ArrayBuffer;
  vy: ArrayBuffer;
}

export interface GraphLayoutWorkerErrorMessage {
  type: 'error';
  message: string;
}

export type GraphLayoutWorkerMessage = GraphLayoutWorkerTickMessage | GraphLayoutWorkerErrorMessage;
