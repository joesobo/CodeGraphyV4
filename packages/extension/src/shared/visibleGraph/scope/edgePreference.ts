import type { IGraphData } from '../../graph/contracts';

export function getEdgeContainingFileKey(
  edge: IGraphData['edges'][number],
  nodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
): string {
  const fromNode = nodeById.get(edge.from);
  const toNode = nodeById.get(edge.to);
  const fromFile = fromNode?.symbol?.filePath ?? edge.from;
  const toFile = toNode?.symbol?.filePath ?? edge.to;

  return `${edge.kind}\0${fromFile}\0${toFile}`;
}

export function getEndpointPreference(
  edge: IGraphData['edges'][number],
  nodeById: ReadonlyMap<string, IGraphData['nodes'][number]>,
): number {
  const fromNode = nodeById.get(edge.from);
  const toNode = nodeById.get(edge.to);
  const endpointSpecificity = Number(Boolean(fromNode?.symbol)) + Number(Boolean(toNode?.symbol));
  return edge.kind === 'type-import' ? -endpointSpecificity : endpointSpecificity;
}

export function rememberBestEndpointPreference(
  bestEndpointPreferenceByKey: Map<string, number>,
  key: string,
  endpointPreference: number,
): void {
  const currentEndpointPreference = bestEndpointPreferenceByKey.get(key);
  bestEndpointPreferenceByKey.set(
    key,
    currentEndpointPreference === undefined
      ? endpointPreference
      : Math.max(currentEndpointPreference, endpointPreference),
  );
}
