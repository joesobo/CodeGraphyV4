export const GRAPH_DETAIL_MIN_ZOOM = 0.35;
const GRAPH_DETAIL_FADE_RANGE = 1.2;
const MIN_VISIBLE_DETAIL_OPACITY = 0.01;

export function graphDetailOpacity(zoom: number): number {
  const opacity = Math.min(
    1,
    Math.max(0, (zoom - GRAPH_DETAIL_MIN_ZOOM) / GRAPH_DETAIL_FADE_RANGE),
  );
  return opacity <= MIN_VISIBLE_DETAIL_OPACITY ? 0 : opacity;
}

export function shouldRenderGraphDetails(zoom: number): boolean {
  return graphDetailOpacity(zoom) > 0;
}
