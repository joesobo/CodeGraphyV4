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
  activation: z.enum(['inherit', 'enabled', 'disabled']).optional().catch(undefined),
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
  if ('activation' in entry && !['inherit', 'enabled', 'disabled'].includes(String(entry.activation))) return false;
  if ('enabled' in entry && typeof entry.enabled !== 'boolean') return false;

  const id = typeof entry.id === 'string' ? entry.id.trim() : '';
  if (id && (typeof entry.activation === 'string' || typeof entry.enabled === 'boolean')) return true;
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

function readPluginActivation(entry: PluginEntryShape): CodeGraphyWorkspacePluginSettings['activation'] | null {
  if (entry.activation) return entry.activation;
  if (typeof entry.enabled === 'boolean') return entry.enabled ? 'enabled' : 'disabled';
  return (entry.package?.trim() ?? '').length > 0 ? 'enabled' : null;
}

function keepLastPluginSettings(
  plugins: readonly CodeGraphyWorkspacePluginSettings[],
): CodeGraphyWorkspacePluginSettings[] {
  const pluginsById = new Map<string, CodeGraphyWorkspacePluginSettings>();
  for (const plugin of plugins) {
    pluginsById.delete(plugin.id);
    pluginsById.set(plugin.id, plugin);
  }
  return [...pluginsById.values()];
}

export function normalizePluginSettings(value: unknown): CodeGraphyWorkspacePluginSettings[] {
  const entries = z.array(z.unknown()).safeParse(value);
  if (!entries.success) {
    return [];
  }

  const plugins = entries.data
    .map(entry => pluginEntrySchema.safeParse(entry))
    .filter(result => result.success)
    .map((result): CodeGraphyWorkspacePluginSettings | null => {
      const entry = result.data;
      const id = readPluginId(entry);
      const activation = readPluginActivation(entry);
      if (id.length === 0 || activation === null) {
        return null;
      }

      const plugin: CodeGraphyWorkspacePluginSettings = {
        id,
        activation,
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
  return keepLastPluginSettings(plugins);
}
