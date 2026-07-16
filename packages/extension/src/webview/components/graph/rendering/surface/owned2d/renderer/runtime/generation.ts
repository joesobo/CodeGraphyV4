import type { OwnedGraphRendererLifecycleRuntime } from './lifecycle';

export function currentRendererGeneration(active: boolean, generation: number, candidate: number): boolean {
  return active && candidate === generation;
}

export function finishOwnedRendererFrame(runtime: OwnedGraphRendererLifecycleRuntime): void {
  if (runtime.frameRequestedRef.current) runtime.requestFrameRef.current();
}

export function rendererDeviceLostMessage(message: string): string {
  return message || 'The WebGPU device was lost.';
}
