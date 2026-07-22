import type {
  CodeGraphyAccessKey,
  IAccessProvider,
  IAccessResult,
  IPlugin,
} from '@codegraphy-dev/plugin-api';

export interface CorePluginAccessContext {
  workspaceRoot?: string;
  disabledPlugins?: ReadonlySet<string>;
}

export interface CorePluginAccessCheck {
  pluginId: string;
  available: boolean;
  access: IAccessResult[];
}

function normalizeAccessRequirement(
  requirement: CodeGraphyAccessKey | readonly CodeGraphyAccessKey[] | undefined,
): CodeGraphyAccessKey[] {
  if (!requirement) {
    return [];
  }

  return typeof requirement === 'string'
    ? [requirement]
    : [...requirement];
}

function findAccessProvider(
  providers: readonly IAccessProvider[],
  access: CodeGraphyAccessKey,
): IAccessProvider | undefined {
  return providers.find(provider => provider.provides.includes(access));
}

async function readAccessResult(
  provider: IAccessProvider,
  access: CodeGraphyAccessKey,
  pluginId: string,
  context: CorePluginAccessContext,
): Promise<IAccessResult> {
  try {
    return await provider.getAccess({
      access,
      pluginId,
      ...(context.workspaceRoot ? { workspaceRoot: context.workspaceRoot } : {}),
    });
  } catch (error) {
    return {
      access,
      state: 'unknown',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resolvePluginAccess(
  plugin: IPlugin,
  providers: readonly IAccessProvider[],
  context: CorePluginAccessContext = {},
  requirement: CodeGraphyAccessKey | readonly CodeGraphyAccessKey[] | undefined = plugin.requiresAccess,
): Promise<CorePluginAccessCheck> {
  const requiredAccess = normalizeAccessRequirement(requirement);
  if (requiredAccess.length === 0) {
    return {
      pluginId: plugin.id,
      available: true,
      access: [],
    };
  }

  const accessResults: IAccessResult[] = [];
  for (const access of requiredAccess) {
    const provider = findAccessProvider(providers, access);
    if (!provider) {
      accessResults.push({
        access,
        state: 'missing',
        reason: `No Access Provider registered for '${access}'.`,
      });
      continue;
    }

    accessResults.push(await readAccessResult(provider, access, plugin.id, context));
  }

  return {
    pluginId: plugin.id,
    available: accessResults.every(result => result.state === 'granted'),
    access: accessResults,
  };
}

export function listAccessProviders<TInfo extends { plugin: IPlugin }>(
  plugins: ReadonlyMap<string, TInfo>,
): IAccessProvider[] {
  return [...plugins.values()]
    .map(info => info.plugin.accessProvider)
    .filter((provider): provider is IAccessProvider => provider !== undefined);
}
