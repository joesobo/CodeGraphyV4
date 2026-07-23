import type { NodeType } from '@codegraphy-dev/plugin-api/graph';
import type { GraphNodeShape2D } from './webview.js';

export interface IExtensionPluginLegendMatch {
  nodeType?: NodeType;
  symbolKinds?: readonly string[];
  symbolPluginKind?: string;
  symbolSource?: string;
  symbolLanguage?: string;
  symbolFilePath?: string;
}

export interface IExtensionPluginLegendEntry {
  id: string;
  label: string;
  pattern: string;
  color: string;
  target?: 'node' | 'edge' | 'both';
  match?: IExtensionPluginLegendMatch;
  shape2D?: GraphNodeShape2D;
  imagePath?: string;
}

export interface IExtensionPluginDescriptorData {
  legendEntries?: readonly IExtensionPluginLegendEntry[];
}
