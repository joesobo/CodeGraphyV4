import type {
  NodeRenderFn,
  OverlayRenderFn,
} from '../api/contracts/webview';

export type NodeRendererRegistry = Map<string, Array<{ pluginId: string; fn: NodeRenderFn }>>;
export type OverlayRegistry = Map<string, { pluginId: string; fn: OverlayRenderFn }>;

export function getRendererFnsForType(
  nodeRenderers: NodeRendererRegistry,
  type: string,
): NodeRenderFn[] {
  const typeRenderers = nodeRenderers.get(type) ?? [];
  const wildcardRenderers = type === '*' ? [] : (nodeRenderers.get('*') ?? []);
  return [...typeRenderers, ...wildcardRenderers].map(entry => entry.fn);
}

export function getOverlayEntries(
  overlays: OverlayRegistry,
): Array<{ id: string; fn: OverlayRenderFn }> {
  return Array.from(overlays.entries()).map(([id, entry]) => ({ id, fn: entry.fn }));
}
