import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);

const pluginDescriptorSchema = z.looseObject({
  id: nonEmptyStringSchema,
  name: nonEmptyStringSchema.optional().catch(undefined),
  host: nonEmptyStringSchema,
  entry: nonEmptyStringSchema,
  apiVersion: nonEmptyStringSchema,
  data: z.unknown().optional(),
});

const pluginPackageJsonSchema = z.looseObject({
  name: nonEmptyStringSchema,
  version: nonEmptyStringSchema,
  codegraphy: z.looseObject({
    plugins: z.array(pluginDescriptorSchema).min(1),
  }),
});

export interface CodeGraphyPluginPackageDescriptor {
  id: string;
  name?: string;
  host: string;
  entry: string;
  apiVersion: string;
  data?: unknown;
}

export interface CodeGraphyPluginPackageManifest {
  package: string;
  version: string;
  plugins: CodeGraphyPluginPackageDescriptor[];
}

export function parseCodeGraphyPluginPackageManifest(
  packageJson: unknown,
): CodeGraphyPluginPackageManifest | null {
  const parsed = pluginPackageJsonSchema.safeParse(packageJson);
  if (!parsed.success) return null;

  const pluginIds = parsed.data.codegraphy.plugins.map(plugin => plugin.id);
  if (new Set(pluginIds).size !== pluginIds.length) return null;

  return {
    package: parsed.data.name,
    version: parsed.data.version,
    plugins: parsed.data.codegraphy.plugins.map(plugin => ({
      id: plugin.id,
      ...(plugin.name ? { name: plugin.name } : {}),
      host: plugin.host,
      entry: plugin.entry,
      apiVersion: plugin.apiVersion,
      ...(plugin.data !== undefined ? { data: plugin.data } : {}),
    })),
  };
}
