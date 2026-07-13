import type {
  GraphLayoutConfig,
  GraphLayoutInput,
  GraphLayoutTickResult,
} from '../physics/contracts';

export interface GraphLayoutTransferBuffers {
  vx: ArrayBuffer;
  vy: ArrayBuffer;
  x: ArrayBuffer;
  y: ArrayBuffer;
}

export type GraphLayoutWorkerCommand =
  | {
    type: 'init';
    input: GraphLayoutInput;
    outputBuffers: [GraphLayoutTransferBuffers, GraphLayoutTransferBuffers];
    revision: number;
  }
  | {
    type: 'tick';
    recycledBuffers?: GraphLayoutTransferBuffers[];
    revision: number;
  }
  | { type: 'setConfig'; config: Partial<GraphLayoutConfig>; mutationRevision: number }
  | {
    type: 'setKinematics';
    buffers: GraphLayoutTransferBuffers;
    mutationRevision: number;
    revision: number;
  }
  | { type: 'setNodePosition'; index: number; mutationRevision: number; x: number; y: number }
  | { type: 'pin'; index: number; mutationRevision: number }
  | { type: 'release'; index: number; mutationRevision: number }
  | { type: 'setHidden'; index: number; hidden: boolean; mutationRevision: number }
  | { type: 'setAlpha'; alpha: number; mutationRevision: number }
  | { type: 'setAlphaTarget'; alpha: number; mutationRevision: number }
  | { type: 'reheat'; alpha?: number; mutationRevision: number }
  | { type: 'pause'; mutationRevision: number }
  | { type: 'resume'; mutationRevision: number };

export interface GraphLayoutWorkerTickMessage {
  alpha: number;
  buffers: GraphLayoutTransferBuffers;
  type: 'tick';
  mutationRevision: number;
  revision: number;
  result: GraphLayoutTickResult;
}

export interface GraphLayoutWorkerKinematicsBuffersMessage {
  buffers: GraphLayoutTransferBuffers;
  revision: number;
  type: 'kinematicsBuffers';
}

export interface GraphLayoutWorkerErrorMessage {
  type: 'error';
  message: string;
  revision: number;
}

export type GraphLayoutWorkerMessage = GraphLayoutWorkerTickMessage
  | GraphLayoutWorkerKinematicsBuffersMessage
  | GraphLayoutWorkerErrorMessage;

export function transferBufferList(buffers: GraphLayoutTransferBuffers): ArrayBuffer[] {
  return [buffers.x, buffers.y, buffers.vx, buffers.vy];
}
