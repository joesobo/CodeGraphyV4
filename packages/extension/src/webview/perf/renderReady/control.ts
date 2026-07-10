import {
  perfRenderReadyMessageSchema,
  perfRenderReadyRequestMessageSchema,
  type PerfRenderReadyMessage,
} from '../../../shared/perf/protocol';
import { postMessage } from '../../vscodeApi';

export interface RenderReadyGraphCounts {
  edgeCount: number;
  nodeCount: number;
}

export interface WebviewRenderReadyControl {
  engineStopped(): void;
  engineTick(): void;
  graphDataReceived(graphRevision?: number): void;
  graphChanged(simulationWillRun: boolean): void;
  handleRequest(message: unknown): boolean;
  renderFramePost(counts: RenderReadyGraphCounts): void;
}

interface WebviewRenderReadyControlOptions {
  postMessage(this: void, message: PerfRenderReadyMessage): void;
}

export function createWebviewRenderReadyControl({
  postMessage: publishMessage,
}: WebviewRenderReadyControlOptions): WebviewRenderReadyControl {
  let engineStopped = false;
  let graphVersion = 0;
  let committedGraphVersion = 0;
  let pendingRequest: { graphVersion: number; requestId: string } | undefined;
  let latestFrame: (RenderReadyGraphCounts & { graphVersion: number }) | undefined;

  const invalidate = (): void => {
    engineStopped = false;
    latestFrame = undefined;
  };

  const publishIfReady = (): void => {
    if (
      !engineStopped
      || !pendingRequest
      || !latestFrame
      || latestFrame.graphVersion < pendingRequest.graphVersion
    ) {
      return;
    }

    const response = perfRenderReadyMessageSchema.safeParse({
      type: 'PERF_RENDER_READY',
      payload: {
        graphRevision: latestFrame.graphVersion,
        requestId: pendingRequest.requestId,
        nodeCount: latestFrame.nodeCount,
        edgeCount: latestFrame.edgeCount,
      },
    });
    if (!response.success) {
      return;
    }

    pendingRequest = undefined;
    publishMessage(response.data);
  };

  return {
    engineStopped(): void {
      engineStopped = true;
      publishIfReady();
    },

    engineTick: invalidate,

    graphDataReceived(nextGraphRevision): void {
      graphVersion = nextGraphRevision === undefined
        ? graphVersion + 1
        : Math.max(graphVersion, nextGraphRevision);
      invalidate();
    },

    graphChanged(simulationWillRun): void {
      committedGraphVersion = graphVersion;
      invalidate();
      if (!simulationWillRun) {
        engineStopped = true;
      }
    },

    handleRequest(message): boolean {
      const request = perfRenderReadyRequestMessageSchema.safeParse(message);
      if (!request.success) {
        return false;
      }

      pendingRequest = {
        graphVersion: request.data.payload.graphRevision,
        requestId: request.data.payload.requestId,
      };
      publishIfReady();
      return true;
    },

    renderFramePost(counts): void {
      latestFrame = { ...counts, graphVersion: committedGraphVersion };
      publishIfReady();
    },
  };
}

export const webviewRenderReadyControl = createWebviewRenderReadyControl({
  postMessage,
});
