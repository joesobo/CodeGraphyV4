import type { EdgeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { DirectionMode } from '../../../../../shared/settings/modes';
import type { ThemeKind } from '../../../../theme/useTheme';

interface GraphRef<TValue> {
  current: TValue;
}

export const DIRECTIONAL_ARROW_NODE_GAP_2D = 0;
export const DIRECTIONAL_ARROW_LENGTH_2D = 12;

export interface LinkRenderingDependencies {
  directionColorRef: GraphRef<string>;
  directionModeRef: GraphRef<DirectionMode>;
  edgeDecorationsRef: GraphRef<Record<string, EdgeDecorationPayload> | undefined>;
  highlightedNodeRef: GraphRef<string | null>;
  themeRef: GraphRef<ThemeKind>;
}
