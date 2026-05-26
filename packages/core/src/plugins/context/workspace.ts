import type {
  IPluginAnalysisContext,
} from '@codegraphy-dev/plugin-api';
import { createWorkspaceAnalysisFileSystem } from './workspaceFileSystem';

export function createWorkspacePluginAnalysisContext(
  workspaceRoot: string,
  options: { pluginOptions?: Record<string, unknown> } = {},
): IPluginAnalysisContext {
  const context: IPluginAnalysisContext = {
    mode: 'workspace',
    fileSystem: createWorkspaceAnalysisFileSystem(workspaceRoot),
  };

  if (options.pluginOptions) {
    context.options = { ...options.pluginOptions };
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
