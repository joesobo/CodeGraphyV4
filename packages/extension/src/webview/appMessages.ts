import { IGraphData } from '../shared/types';
import type { CodeGraphyWebviewAPI } from './pluginHost/types';

export interface PluginWebviewModule {
  activate?: (api: CodeGraphyWebviewAPI) => void | Promise<void>;
  default?:
    | ((api: CodeGraphyWebviewAPI) => void | Promise<void>)
    | { activate?: (api: CodeGraphyWebviewAPI) => void | Promise<void> };
}

export interface PluginInjectPayload {
  pluginId: string;
  scripts: string[];
  styles: string[];
}

export interface PluginScopedMessage {
  pluginId: string;
  message: { type: string; data: unknown };
}

export function normalizePluginInjectPayload(payload: unknown): PluginInjectPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as { pluginId?: unknown; scripts?: unknown; styles?: unknown };
  if (typeof candidate.pluginId !== 'string') {
    return null;
  }

  return {
    pluginId: candidate.pluginId,
    scripts: Array.isArray(candidate.scripts)
      ? candidate.scripts.filter((script): script is string => typeof script === 'string')
      : [],
    styles: Array.isArray(candidate.styles)
      ? candidate.styles.filter((style): style is string => typeof style === 'string')
      : [],
  };
}

export function parsePluginScopedMessage(type: string, data: unknown): PluginScopedMessage | null {
  if (!type.startsWith('plugin:')) {
    return null;
  }

  const [, pluginId, ...typeParts] = type.split(':');
  if (!pluginId || typeParts.length === 0) {
    return null;
  }

  return {
    pluginId,
    message: { type: typeParts.join(':'), data },
  };
}

export function resolvePluginModuleActivator(
  mod: PluginWebviewModule,
): ((api: CodeGraphyWebviewAPI) => void | Promise<void>) | undefined {
  const candidate = mod.activate ?? mod.default;
  if (typeof candidate === 'function') {
    return candidate;
  }

  if (candidate && typeof candidate === 'object' && 'activate' in candidate) {
    return candidate.activate;
  }

  return undefined;
}

export function getNoDataHint(
  graphData: IGraphData | null,
  showOrphans: boolean,
): string {
  return graphData && !showOrphans
    ? 'All files are hidden. Try enabling "Show Orphans" in Settings → Filters.'
    : 'Open a folder to visualize its structure.';
}
