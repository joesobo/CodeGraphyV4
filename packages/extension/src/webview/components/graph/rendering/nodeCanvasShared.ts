import type {
  NodeDecorationPayload,
} from '../../../../shared/types';
import type { ThemeKind } from '../../../useTheme';
import type { WebviewPluginHost } from '../../../pluginHost';

interface GraphRef<TValue> {
  current: TValue;
}

export interface NodeCanvasRendererDependencies {
  highlightedNeighborsRef: GraphRef<Set<string>>;
  highlightedNodeRef: GraphRef<string | null>;
  nodeDecorationsRef: GraphRef<Record<string, NodeDecorationPayload> | undefined>;
  selectedNodesSetRef: GraphRef<Set<string>>;
  showLabelsRef: GraphRef<boolean>;
  themeRef: GraphRef<ThemeKind>;
  pluginHost?: WebviewPluginHost;
  triggerImageRerender: (this: void) => void;
}
