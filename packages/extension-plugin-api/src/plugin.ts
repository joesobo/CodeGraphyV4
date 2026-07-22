export interface IExtensionPluginWebviewAsset {
  id: string;
  label: string;
  path: string;
  kind?: string;
  metadata?: Record<string, unknown>;
}

export interface IExtensionPluginWebviewContributions {
  scripts?: string[];
  styles?: string[];
  assets?: IExtensionPluginWebviewAsset[];
}

export interface IExtensionPlugin {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  webviewContributions?: IExtensionPluginWebviewContributions;
  initialize?(workspaceRoot: string): void | Promise<void>;
  onWebviewReady?(): void;
  onUnload?(): void;
}

export type IExtensionPluginFactory = () => IExtensionPlugin | Promise<IExtensionPlugin>;
