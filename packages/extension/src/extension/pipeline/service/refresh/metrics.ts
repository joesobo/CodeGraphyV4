import type { IGraphData } from '../../../../shared/graph/contracts';

interface GraphMetricPatchResult {
  changed: boolean;
  node: IGraphData['nodes'][number];
}

interface PatchGraphDataNodeMetricsInput {
  filePaths: readonly string[];
  fileSizes: Record<string, { size?: number } | undefined>;
  graphData: IGraphData;
}

export function patchGraphDataNodeMetrics(input: PatchGraphDataNodeMetricsInput): IGraphData {
  const metricFilePaths = new Set(input.filePaths.map(normalizeGraphMetricFilePath));
  if (metricFilePaths.size === 0) {
    return input.graphData;
  }

  let changed = false;
  const nodes = input.graphData.nodes.map((node) => {
    const result = patchGraphDataNodeMetric(node, metricFilePaths, input);
    changed ||= result.changed;
    return result.node;
  });

  return changed ? { ...input.graphData, nodes } : input.graphData;
}

function normalizeGraphMetricFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function getGraphMetricNodeFilePath(node: IGraphData['nodes'][number]): string {
  const symbolFilePath = node.symbol?.filePath;
  return normalizeGraphMetricFilePath(
    typeof symbolFilePath === 'string' && symbolFilePath.length > 0
      ? symbolFilePath
      : node.id,
  );
}

function patchGraphDataNodeMetric(
  node: IGraphData['nodes'][number],
  metricFilePaths: ReadonlySet<string>,
  input: PatchGraphDataNodeMetricsInput,
): GraphMetricPatchResult {
  const filePath = getGraphMetricNodeFilePath(node);
  if (!metricFilePaths.has(filePath)) {
    return { changed: false, node };
  }

  const fileSize = input.fileSizes[filePath]?.size;
  if (node.fileSize === fileSize) {
    return { changed: false, node };
  }

  return { changed: true, node: { ...node, fileSize } };
}
