import { graphNodeDrawnArea } from '@codegraphy-dev/graph-renderer';
import type { FGNode } from '../../../model/build';

export function nodeDrawnArea(node: FGNode): number {
  return graphNodeDrawnArea(
    node.shapeSize2D?.width ?? (node.size ?? 0) * 2,
    node.shapeSize2D?.height ?? (node.size ?? 0) * 2,
  );
}
