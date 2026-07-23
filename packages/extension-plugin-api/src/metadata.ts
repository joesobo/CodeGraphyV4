import type { GraphNodeShape2D } from './webview.js';

export interface IPluginFileColorDefinition {
  color: string;
  shape2D?: GraphNodeShape2D;
  imagePath?: string;
}

export interface IExtensionPluginDescriptorData {
  fileColors?: Record<string, string | IPluginFileColorDefinition>;
}
