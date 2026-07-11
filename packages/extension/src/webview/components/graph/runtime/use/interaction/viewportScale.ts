interface GraphViewportScaleReader {
  zoom(): unknown;
}

export function readGraphViewportScale(
  graph: unknown,
): number | null {
  const scale = (graph as GraphViewportScaleReader | undefined)?.zoom?.();
  if (!Number.isFinite(scale as number)) {
    return null;
  }

  return (scale as number) > 0
    ? scale as number
    : null;
}
