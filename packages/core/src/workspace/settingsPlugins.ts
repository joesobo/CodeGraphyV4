import type { CodeGraphyWorkspacePluginSettings } from './settingsContracts';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
} from './settingsDefaults';
import { z } from 'zod';
import { looseStringArraySchema, unknownRecordSchema } from '../values';

const pluginEntrySchema = z.looseObject({
  id: z.string().optional().catch(undefined),
  package: z.string().optional().catch(undefined),
  enabled: z.boolean().optional().catch(undefined),
  disabledFilterPatterns: looseStringArraySchema,
  options: unknownRecordSchema.optional().catch(undefined),
});

type PluginEntryShape = z.infer<typeof pluginEntrySchema>;

export function hasSupportedRawPluginIdentity(value: unknown): boolean {
  const parsed = unknownRecordSchema.safeParse(value);
  if (!parsed.success) return false;
  const entry = parsed.data;
  if ('id' in entry && typeof entry.id !== 'string') return false;
  if ('package' in entry && typeof entry.package !== 'string') return false;
  if ('enabled' in entry && typeof entry.enabled !== 'boolean') return false;

  const id = typeof entry.id === 'string' ? entry.id.trim() : '';
  if (id && typeof entry.enabled === 'boolean') return true;
  const packageName = typeof entry.package === 'string' ? entry.package.trim() : '';
  return packageName.length > 0;
}

function readPluginId(entry: PluginEntryShape): string {
  const id = entry.id?.trim() ?? '';
  if (id.length > 0) {
    return id;
  }

  const packageName = entry.package?.trim() ?? '';
  if (packageName === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME) {
    return CODEGRAPHY_MARKDOWN_PLUGIN_ID;
  }

  return packageName;
}

function readPluginEnabled(entry: PluginEntryShape): boolean | null {
  if (typeof entry.enabled === 'boolean') {
    return entry.enabled;
  }

  return (entry.package?.trim() ?? '').length > 0 ? true : null;
}

export function normalizePluginSettings(value: unknown): CodeGraphyWorkspacePluginSettings[] {
  const entries = z.array(z.unknown()).safeParse(value);
  if (!entries.success) {
    return [];
  }

  return entries.data
    .map(entry => pluginEntrySchema.safeParse(entry))
    .filter(result => result.success)
    .map((result): CodeGraphyWorkspacePluginSettings | null => {
      const entry = result.data;
      const id = readPluginId(entry);
      const enabled = readPluginEnabled(entry);
      if (id.length === 0 || enabled === null) {
        return null;
      }

      const plugin: CodeGraphyWorkspacePluginSettings = {
        id,
        enabled,
      };
      if (entry.disabledFilterPatterns.length > 0) {
        plugin.disabledFilterPatterns = [...new Set(entry.disabledFilterPatterns)];
      }

      if (entry.options) {
        plugin.options = { ...entry.options };
      }

      return plugin;
    })
    .filter((entry): entry is CodeGraphyWorkspacePluginSettings => entry !== null);
}
