interface GraphViewportScaleReader {
  zoom(): unknown;
}

export function readGraphViewportScale(
  graphMode: '2d' | '3d',
  graph: unknown,
): number | null {
  if (graphMode !== '2d') {
    return null;
  }

  const scale = (graph as GraphViewportScaleReader | undefined)?.zoom?.();
  if (!Number.isFinite(scale as number)) {
    return null;
  }

  return (scale as number) > 0
    ? scale as number
    : null;
}
