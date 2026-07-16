import type { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';

export function createdRendererResult(
  currentGeneration: boolean,
  renderer: WebGpuGraphRenderer | undefined,
): 'stale' | 'unavailable' | WebGpuGraphRenderer {
  if (!currentGeneration) {
    renderer?.dispose();
    return 'stale';
  }
  return renderer ?? 'unavailable';
}

export function rendererCreationError(currentGeneration: boolean, error: unknown): string | undefined {
  if (!currentGeneration) return undefined;
  return error instanceof Error ? error.message : String(error);
}
