import type { EdgeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { GraphAppearance } from '../../appearance/model';

interface GraphRef<TValue> {
  current: TValue;
}

export interface LinkRenderingDependencies {
  directionColorRef: GraphRef<string>;
  edgeDecorationsRef: GraphRef<Record<string, EdgeDecorationPayload> | undefined>;
  highlightedNodeRef: GraphRef<string | null>;
  graphAppearanceRef: GraphRef<GraphAppearance>;
}
