import type { EdgeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { GraphAppearance } from '../../appearance/model';

interface GraphRef<TValue> {
  current: TValue;
}

export interface LinkRenderingDependencies {
  edgeDecorationsRef: GraphRef<Record<string, EdgeDecorationPayload> | undefined>;
  highlightedNodeRef: GraphRef<string | null>;
  graphAppearanceRef: GraphRef<GraphAppearance>;
  resolveColor(this: void, value: string | undefined, fallback: string): string;
}
