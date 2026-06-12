/**
 * @fileoverview Plugin message validation and parsing.
 * @module webview/pluginMessageValidation
 */

export interface PluginInjectPayload {
  pluginId: string;
  scripts: string[];
  styles: string[];
  assets?: PluginWebviewAsset[];
}

export interface PluginWebviewAsset {
  id: string;
  label: string;
  url: string;
  path?: string;
  kind?: string;
  metadata?: Record<string, unknown>;
}

export interface PluginScopedMessage {
  pluginId: string;
  message: { type: string; data: unknown };
}

export function normalizePluginInjectPayload(payload: unknown): PluginInjectPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as { pluginId?: unknown; scripts?: unknown; styles?: unknown; assets?: unknown };
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
    assets: Array.isArray(candidate.assets)
      ? candidate.assets.filter(isPluginWebviewAsset)
      : [],
  };
}

function isPluginWebviewAsset(value: unknown): value is PluginWebviewAsset {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PluginWebviewAsset>;
  return typeof candidate.id === 'string'
    && typeof candidate.label === 'string'
    && typeof candidate.url === 'string';
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
