import type {
  CodeGraphyAccessKey,
  GraphViewAccessRequirement,
  IAccessProvider,
  IAccessResult,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
  IPlugin,
} from '@codegraphy/plugin-api';

export interface CorePluginAccessContext {
  workspaceRoot?: string;
}

export interface CorePluginAccessCheck {
  pluginId: string;
  available: boolean;
  access: IAccessResult[];
}

export interface CoreGraphViewContributionEntry<TContribution> {
  pluginId: string;
  contribution: TContribution;
}

export interface CoreGraphViewContributionSet {
  runtimeNodes: CoreGraphViewContributionEntry<IGraphViewRuntimeNodeContribution>[];
  runtimeEdges: CoreGraphViewContributionEntry<IGraphViewRuntimeEdgeContribution>[];
  projections: CoreGraphViewContributionEntry<IGraphViewProjectionContribution>[];
  forces: CoreGraphViewContributionEntry<IGraphViewForceAdapterContribution>[];
  contextMenu: CoreGraphViewContributionEntry<IGraphViewContextMenuContribution>[];
  ui: CoreGraphViewContributionEntry<IGraphViewUiSlotContribution>[];
}

export function createEmptyGraphViewContributionSet(): CoreGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
    contextMenu: [],
    ui: [],
  };
}

function normalizeAccessRequirement(
  requirement: GraphViewAccessRequirement | undefined,
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
  requirement: GraphViewAccessRequirement | undefined = plugin.requiresAccess,
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
