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
  /** Semver range of supported Extension host APIs. The current host API is 2.0.0. */
  apiVersion: string;
  webviewContributions?: IExtensionPluginWebviewContributions;
  initialize?(workspaceRoot: string): void | Promise<void>;
  onWebviewReady?(): void;
  onUnload?(): void;
}

export interface IExtensionPluginFactoryOptions {
  /** Workspace-scoped persistence owned by the descriptor plugin ID. */
  dataHost?: IPluginDataHost;
  /** Merged package default options and CodeGraphy Workspace plugin options. */
  options?: Record<string, unknown>;
}

export type IExtensionPluginFactory = (
  options?: IExtensionPluginFactoryOptions,
) => IExtensionPlugin | Promise<IExtensionPlugin>;
import type { IPluginDataHost } from '@codegraphy-dev/plugin-api/data';
