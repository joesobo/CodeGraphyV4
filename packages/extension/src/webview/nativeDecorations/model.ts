import type { NodeDecorationPayload } from '../../shared/plugins/decorations';

function mergeNodeDecoration(
  plugin: NodeDecorationPayload | undefined,
  native: NodeDecorationPayload | undefined,
): NodeDecorationPayload {
  const pluginSections = plugin?.tooltip?.sections ?? [];
  const nativeSections = native?.tooltip?.sections ?? [];
  return {
    ...plugin,
    ...native,
    ...(pluginSections.length > 0 || nativeSections.length > 0
      ? { tooltip: { sections: [...nativeSections, ...pluginSections] } }
      : {}),
  };
}

export function mergeNodeDecorationMaps(
  pluginDecorations: Record<string, NodeDecorationPayload>,
  nativeDecorations: Record<string, NodeDecorationPayload>,
): Record<string, NodeDecorationPayload> {
  const nodeIds = new Set([
    ...Object.keys(pluginDecorations),
    ...Object.keys(nativeDecorations),
  ]);
  return Object.fromEntries([...nodeIds].map(nodeId => [
    nodeId,
    mergeNodeDecoration(pluginDecorations[nodeId], nativeDecorations[nodeId]),
  ]));
}
