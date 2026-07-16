import type {
  IPluginAnalysisContext,
} from '@codegraphy-dev/plugin-api';
import { createWorkspaceAnalysisFileSystem } from './workspaceFileSystem';

export function createWorkspacePluginAnalysisContext(
  workspaceRoot: string,
  options: {
    features?: IPluginAnalysisContext['features'];
    pluginOptions?: Record<string, unknown>;
    workspaceFiles?: IPluginAnalysisContext['workspaceFiles'];
  } = {},
): IPluginAnalysisContext {
  const context: IPluginAnalysisContext = {
    fileSystem: createWorkspaceAnalysisFileSystem(workspaceRoot),
  };

  if (options.features) {
    context.features = { ...options.features };
  }

  if (options.pluginOptions) {
    context.options = { ...options.pluginOptions };
  }

  if (options.workspaceFiles) {
    context.workspaceFiles = [...options.workspaceFiles];
  }

  return context;
}

export function withWorkspacePluginAnalysisOptions(
  context: IPluginAnalysisContext,
  pluginOptions: Record<string, unknown> | undefined,
): IPluginAnalysisContext {
  if (!pluginOptions) {
    return context;
  }

  return {
    ...context,
    options: { ...pluginOptions },
  };
}
