import type { IGraphData } from '../../../shared/graph/contracts';
import type { CodeGraphyAPI } from './fixture';

export function waitForExtensionMessage(
  api: CodeGraphyAPI,
  type: string,
  timeoutMs: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for webview message: ${type}`)),
      timeoutMs,
    );
    const disposable = api.onExtensionMessage((message: unknown) => {
      if ((message as { type: string }).type === type) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(message);
      }
    });
  });
}

export function waitForExtensionMessageWhere<TMessage>(
  api: CodeGraphyAPI,
  type: string,
  predicate: (message: TMessage) => boolean,
  timeoutMs: number,
): Promise<TMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for webview message: ${type}`)),
      timeoutMs,
    );
    const disposable = api.onExtensionMessage((candidate: unknown) => {
      const message = candidate as TMessage & { type?: string };
      if (message.type !== type || !predicate(message)) return;
      clearTimeout(timer);
      disposable.dispose();
      resolve(message);
    });
  });
}

export async function waitForGraphIndexStatus(
  api: CodeGraphyAPI,
  hasIndex: boolean,
  timeoutMs = 15_000,
): Promise<void> {
  await waitForExtensionMessageWhere<{
    type: 'GRAPH_INDEX_STATUS_UPDATED';
    payload: { hasIndex: boolean };
  }>(
    api,
    'GRAPH_INDEX_STATUS_UPDATED',
    message => message.payload.hasIndex === hasIndex,
    timeoutMs,
  );
}

function waitForWebviewMessage(
  api: CodeGraphyAPI,
  type: string,
  timeoutMs: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for webview message: ${type}`)),
      timeoutMs,
    );
    const disposable = api.onWebviewMessage((message: unknown) => {
      if ((message as { type: string }).type === type) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(message);
      }
    });
  });
}

function requestWebviewMessage(
  api: CodeGraphyAPI,
  responseType: string,
  requestMessage: unknown,
  timeoutMs: number,
  retryMs = 1_000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      clearInterval(interval);
      disposable.dispose();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for webview message: ${responseType}`));
    }, timeoutMs);
    const interval = setInterval(() => api.sendToWebview(requestMessage), retryMs);
    const disposable = api.onWebviewMessage((message: unknown) => {
      if ((message as { type: string }).type === responseType) {
        cleanup();
        resolve(message);
      }
    });

    api.sendToWebview(requestMessage);
  });
}

export async function waitForGraphDataUpdate(
  api: CodeGraphyAPI,
  timeoutMs = 15_000,
): Promise<IGraphData> {
  await waitForExtensionMessage(api, 'GRAPH_DATA_UPDATED', timeoutMs);
  return api.getGraphData();
}

export interface NodeBounds {
  id: string;
  x: number;
  y: number;
  size: number;
}

interface NodeBoundsResponse {
  payload: { nodes: NodeBounds[] };
}

interface GraphRuntimeStateResponse {
  payload: {
    edgeCount: number;
    edgeIds: string[];
    nodeCount: number;
  };
}

export interface VisibleGraphState {
  edgeCount: number;
  edgeIds: string[];
  nodeCount: number;
  nodes: Array<{ id: string; nodeType?: string; color: string }>;
}

interface VisibleGraphStateResponse {
  payload: VisibleGraphState;
}

export async function requestNodeBounds(
  api: CodeGraphyAPI,
  timeoutMs = 5_000,
): Promise<NodeBounds[]> {
  const boundsPromise = waitForWebviewMessage(api, 'NODE_BOUNDS_RESPONSE', timeoutMs);
  api.sendToWebview({ type: 'GET_NODE_BOUNDS' });
  const boundsMessage = await boundsPromise as NodeBoundsResponse;
  return boundsMessage.payload.nodes;
}

export async function requestGraphRuntimeState(
  api: CodeGraphyAPI,
  timeoutMs = 5_000,
): Promise<GraphRuntimeStateResponse['payload']> {
  const statePromise = waitForWebviewMessage(api, 'GRAPH_RUNTIME_STATE_RESPONSE', timeoutMs);
  api.sendToWebview({ type: 'GET_GRAPH_RUNTIME_STATE' });
  const stateMessage = await statePromise as GraphRuntimeStateResponse;
  return stateMessage.payload;
}

export async function requestVisibleGraphState(
  api: CodeGraphyAPI,
  timeoutMs = 5_000,
): Promise<VisibleGraphState> {
  const stateMessage = await requestWebviewMessage(
    api,
    'VISIBLE_GRAPH_STATE_RESPONSE',
    { type: 'GET_VISIBLE_GRAPH_STATE' },
    timeoutMs,
  ) as VisibleGraphStateResponse;
  return stateMessage.payload;
}
