/**
 * @fileoverview Plugin message validation and parsing.
 * @module webview/pluginMessageValidation
 */

import { z } from 'zod';
import { looseStringArraySchema } from '../../shared/values';

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

const pluginWebviewAssetSchema = z.looseObject({
  id: z.string(),
  label: z.string(),
  url: z.string(),
}).transform((asset): PluginWebviewAsset => asset as PluginWebviewAsset);

const pluginWebviewAssetsSchema = z
  .array(z.unknown())
  .catch([])
  .transform((entries): PluginWebviewAsset[] => entries.flatMap((entry) => {
    const parsed = pluginWebviewAssetSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  }));

const pluginInjectPayloadSchema = z.looseObject({
  pluginId: z.string(),
  scripts: looseStringArraySchema,
  styles: looseStringArraySchema,
  assets: pluginWebviewAssetsSchema,
});

const pluginScopedMessageSchema = z.object({
  pluginId: z.string(),
  message: z.object({
    type: z.string(),
    data: z.unknown(),
  }),
});

export function normalizePluginInjectPayload(payload: unknown): PluginInjectPayload | null {
  const parsed = pluginInjectPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function parsePluginScopedMessage(type: string, data: unknown): PluginScopedMessage | null {
  if (!type.startsWith('plugin:')) {
    return null;
  }

  const [, pluginId, ...typeParts] = type.split(':');
  if (!pluginId || typeParts.length === 0) {
    return null;
  }

  const parsed = pluginScopedMessageSchema.safeParse({
    pluginId,
    message: { type: typeParts.join(':'), data },
  });

  return parsed.success ? parsed.data : null;
}
