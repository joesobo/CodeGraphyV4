import type {
  GraphLayoutConfig,
  GraphLayoutInput,
  GraphLayoutTickResult,
} from '../physics/contracts';

export type GraphLayoutWorkerCommand =
  | { type: 'init'; input: GraphLayoutInput; revision: number }
  | { type: 'tick'; elapsedMs: number; revision: number }
  | { type: 'setConfig'; config: Partial<GraphLayoutConfig>; mutationRevision: number }
  | {
    type: 'setKinematics';
    mutationRevision: number;
    vx: ArrayBuffer;
    vy: ArrayBuffer;
    x: ArrayBuffer;
    y: ArrayBuffer;
  }
  | { type: 'setNodePosition'; index: number; mutationRevision: number; x: number; y: number }
  | { type: 'pin'; index: number; mutationRevision: number }
  | { type: 'release'; index: number; mutationRevision: number }
  | { type: 'setHidden'; index: number; hidden: boolean; mutationRevision: number }
  | { type: 'setAlphaTarget'; alpha: number; mutationRevision: number }
  | { type: 'reheat'; alpha?: number; mutationRevision: number }
  | { type: 'pause'; mutationRevision: number }
  | { type: 'resume'; mutationRevision: number };

export interface GraphLayoutWorkerTickMessage {
  type: 'tick';
  mutationRevision: number;
  revision: number;
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
