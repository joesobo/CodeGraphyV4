import type { GraphRendererFrame } from '../../contracts';
import { writeArrowCurveParameters } from '../arrow/geometry';
import { LINK_GEOMETRY_FLOATS } from '../bufferLayout';

export function writeLinkGeometry(
  output: Float32Array,
  frame: GraphRendererFrame,
  linkIndex: number,
  renderedIndex: number,
  curvature: number,
  writeArrows: boolean,
  nodeVisualScale: number,
  nodeStyles: ReturnType<GraphRendererFrame['getNodeStyle']>[],
): void {
  const sourceIndex = frame.edgeSources[linkIndex];
  const targetIndex = frame.edgeTargets[linkIndex];
  const sourceX = frame.nodeX[sourceIndex] ?? 0;
  const sourceY = frame.nodeY[sourceIndex] ?? 0;
  const targetX = frame.nodeX[targetIndex] ?? 0;
  const targetY = frame.nodeY[targetIndex] ?? 0;
  const offset = renderedIndex * LINK_GEOMETRY_FLOATS;
  output.set([sourceX, sourceY, targetX, targetY], offset);
  if (!writeArrows) return;
  writeArrowCurveParameters(
    output,
    offset + 4,
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature,
    nodeStyles[sourceIndex],
    nodeStyles[targetIndex],
    nodeVisualScale,
  );
}
