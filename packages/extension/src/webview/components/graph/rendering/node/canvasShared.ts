import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import type { GraphAppearance } from '../../appearance/model';

interface GraphRef<TValue> {
  current: TValue;
}

export interface NodeCanvasRendererDependencies {
  highlightedNeighborsRef: GraphRef<Set<string>>;
  highlightedNodeRef: GraphRef<string | null>;
  nodeDecorationsRef: GraphRef<Record<string, NodeDecorationPayload> | undefined>;
  selectedNodesSetRef: GraphRef<Set<string>>;
  showLabelsRef: GraphRef<boolean>;
  graphAppearanceRef: GraphRef<GraphAppearance>;
  pluginHost?: WebviewPluginHost;
  resolveColor(this: void, value: string | undefined, fallback: string): string;
  triggerImageRerender: (this: void) => void;
}
