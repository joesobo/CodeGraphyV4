/**
 * @fileoverview Plugin message validation and parsing.
 * @module webview/pluginMessageValidation
 */

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
