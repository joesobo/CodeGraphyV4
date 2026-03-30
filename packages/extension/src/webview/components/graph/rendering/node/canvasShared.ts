import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { ThemeKind } from '../../../../theme/useTheme';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';

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
