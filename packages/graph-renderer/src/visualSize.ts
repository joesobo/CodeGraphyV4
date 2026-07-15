const MINIMUM_VISUAL_ZOOM = 0.0001;

function positiveZoom(zoom: number): number {
  return Math.max(MINIMUM_VISUAL_ZOOM, zoom);
}

/** Inverse-square-root compensation applied to graph-space node geometry. */
export function graphNodeWorldScale(zoom: number): number {
  return 1 / Math.sqrt(positiveZoom(zoom));
}

export function graphNodeScreenRadius(radius: number, zoom: number): number {
  return radius * Math.sqrt(positiveZoom(zoom));
}
