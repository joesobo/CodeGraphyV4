import { useEffect } from 'react';
import type { IGraphData } from '../../../shared/graph/contracts';
import { DEFAULT_NODE_COLOR } from '../../../shared/fileColors';
import { postMessage as postWebviewMessage } from '../../vscodeApi';

export function createVisibleGraphStatePayload(graphData: IGraphData | null | undefined) {
  return {
    nodeCount: graphData?.nodes.length ?? 0,
    nodes: graphData?.nodes.map(node => ({
      id: node.id,
      nodeType: node.nodeType,
      color: node.color ?? DEFAULT_NODE_COLOR,
    })) ?? [],
    edgeCount: graphData?.edges.length ?? 0,
    edgeIds: graphData?.edges.map(edge => edge.id) ?? [],
  };
}

export function isVisibleGraphStateRequest(data: unknown): boolean {
  const raw = data as { type?: unknown } | null;
  return Boolean(raw && raw.type === 'GET_VISIBLE_GRAPH_STATE');
}

export function useVisibleGraphStateResponse(displayGraphData: IGraphData | null | undefined): void {
  useEffect(() => {
    const handleVisibleGraphStateRequest = (event: MessageEvent<unknown>) => {
      if (!isVisibleGraphStateRequest(event.data)) {
        return;
      }

      postWebviewMessage({
        type: 'VISIBLE_GRAPH_STATE_RESPONSE',
        payload: createVisibleGraphStatePayload(displayGraphData),
      });
    };

    window.addEventListener('message', handleVisibleGraphStateRequest);
    return () => window.removeEventListener('message', handleVisibleGraphStateRequest);
  }, [displayGraphData]);
}
