import { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';

interface RendererCreationCallbacks {
  onDeviceLost(message: string): void;
  onFrameComplete(submissionId: number): void;
  onFrameRejected(submissionId: number): void;
  onRendererError(message: string): void;
  onCreated(renderer: WebGpuGraphRenderer | undefined): void;
  onCreationError(error: unknown): void;
}

export function beginOwnedWebGpuRendererCreation(
  canvas: HTMLCanvasElement,
  callbacks: RendererCreationCallbacks,
): void {
  void WebGpuGraphRenderer.create(canvas, callbacks)
    .then(renderer => callbacks.onCreated(renderer))
    .catch(error => callbacks.onCreationError(error));
}
