import * as path from 'node:path';
import {
  createBundledMarkdownInstalledPluginRecord,
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
  registerCodeGraphyInstalledPlugin,
  type RegisterCodeGraphyInstalledPluginOptions,
} from '../../plugins/installedCache';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  readCodeGraphyWorkspaceSettingsOrInitial,
} from '../../workspace/settings';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import { resolveNpmGlobalPackageRoots } from './globalPackages';

type PluginsCommandDependencies = {
  cwd(): string;
  disableWorkspacePlugin(workspaceRoot: string, packageName: string): void;
  enableWorkspacePlugin(workspaceRoot: string, plugin: CodeGraphyInstalledPluginRecord): void;
  homeDir?: string;
  readInstalledPluginCache(options?: CodeGraphyUserStateOptions): CodeGraphyInstalledPluginCache;
  registerInstalledPlugin(options: RegisterCodeGraphyInstalledPluginOptions): Promise<CodeGraphyInstalledPluginRecord>;
  resolveGlobalPackageRoots(): string[];
};

const DEFAULT_DEPENDENCIES: PluginsCommandDependencies = {
  cwd: () => process.cwd(),
  disableWorkspacePlugin: disableCodeGraphyWorkspacePlugin,
  enableWorkspacePlugin: enableCodeGraphyWorkspacePlugin,
  readInstalledPluginCache: readCodeGraphyInstalledPluginCache,
  registerInstalledPlugin: registerCodeGraphyInstalledPlugin,
  resolveGlobalPackageRoots: resolveNpmGlobalPackageRoots,
};

function createHelpResult(): CommandExecutionResult {
  return {
    exitCode: 0,
    output: [
      'CodeGraphy plugin commands',
      '',
      'Commands:',
      '  codegraphy plugins register <package>',
      '  codegraphy plugins list [workspace]',
      '  codegraphy plugins enable <package> [workspace]',
      '  codegraphy plugins disable <package> [workspace]',
    ].join('\n'),
  };
}

function resolveWorkspaceRoot(
  workspacePath: string | undefined,
  dependencies: Pick<PluginsCommandDependencies, 'cwd'>,
): string {
  return path.resolve(dependencies.cwd(), workspacePath ?? '.');
}

function findCachedPlugin(
  cache: CodeGraphyInstalledPluginCache,
  packageName: string,
): CodeGraphyInstalledPluginRecord | undefined {
  if (packageName === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME) {
    return createBundledMarkdownInstalledPluginRecord();
  }

  return cache.plugins.find(plugin => plugin.package === packageName);
}

function listInstalledPluginsWithBundledMarkdown(
  cache: CodeGraphyInstalledPluginCache,
): CodeGraphyInstalledPluginRecord[] {
  if (cache.plugins.some(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)) {
    return cache.plugins;
  }

  return [
    createBundledMarkdownInstalledPluginRecord(),
    ...cache.plugins,
  ];
}

function createMissingPackageResult(action: 'disable' | 'enable' | 'register'): CommandExecutionResult {
  const workspaceSuffix = action === 'register' ? '' : ' [workspace]';
  return {
    exitCode: 1,
    output: `Usage: codegraphy plugins ${action} <package>${workspaceSuffix}`,
  };
}

async function runRegisterCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): Promise<CommandExecutionResult> {
  if (!command.packageName) {
    return createMissingPackageResult('register');
  }

  const globalPackageRoots = dependencies.resolveGlobalPackageRoots();
  if (globalPackageRoots.length === 0) {
    return {
      exitCode: 1,
      output: 'Could not find the global npm package root. Confirm npm is installed, then retry.',
    };
  }

  const record = await dependencies.registerInstalledPlugin({
    homeDir: dependencies.homeDir,
    packageName: command.packageName,
    globalPackageRoots,
  });

  return {
    exitCode: 0,
    output: `Registered ${record.package} in ~/.codegraphy/plugins.json.`,
  };
}

function runEnableCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('enable');
  }

  const plugin = findCachedPlugin(
    dependencies.readInstalledPluginCache({ homeDir: dependencies.homeDir }),
    command.packageName,
  );
  if (!plugin) {
    return {
      exitCode: 1,
      output: [
        `Plugin '${command.packageName}' is not in ~/.codegraphy/plugins.json.`,
        `Run \`codegraphy plugins register ${command.packageName}\`, then retry.`,
      ].join(' '),
    };
  }

  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  dependencies.enableWorkspacePlugin(workspaceRoot, plugin);
  return {
    exitCode: 0,
    output: `Enabled ${plugin.package} for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
  };
}

function runDisableCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  if (!command.packageName) {
    return createMissingPackageResult('disable');
  }

  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  dependencies.disableWorkspacePlugin(workspaceRoot, command.packageName);
  return {
    exitCode: 0,
    output: `Disabled ${command.packageName} for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
  };
}

function runListCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): CommandExecutionResult {
  const workspaceRoot = resolveWorkspaceRoot(command.workspacePath, dependencies);
  const installedPlugins = listInstalledPluginsWithBundledMarkdown(
    dependencies.readInstalledPluginCache({
      homeDir: dependencies.homeDir,
    }),
  );
  const enabledPlugins = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot).plugins;
  const enabledPackages = new Set(enabledPlugins.map(plugin => plugin.package));
  const disabledPlugins = installedPlugins.filter(plugin => !enabledPackages.has(plugin.package));

  const lines = [
    `CodeGraphy plugins for ${workspaceRoot}`,
    '',
    'Enabled in workspace:',
    ...(
      enabledPlugins.length > 0
        ? enabledPlugins.map((plugin, index) => `${index + 1}. ${plugin.package}`)
        : ['none']
    ),
    '',
    'Installed but disabled:',
    ...(
      disabledPlugins.length > 0
        ? disabledPlugins.map(plugin => `- ${plugin.package}`)
        : ['none']
    ),
  ];

  return {
    exitCode: 0,
    output: lines.join('\n'),
  };
}

export async function runPluginsCommand(
  command: CliCommand,
  dependencies: Partial<PluginsCommandDependencies> = {},
): Promise<CommandExecutionResult> {
  const mergedDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...dependencies,
  };

  try {
    switch (command.action) {
      case 'register':
        return runRegisterCommand(command, mergedDependencies);
      case 'enable':
        return runEnableCommand(command, mergedDependencies);
      case 'disable':
        return runDisableCommand(command, mergedDependencies);
      case 'list':
        return runListCommand(command, mergedDependencies);
      case 'help':
      default:
        return createHelpResult();
    }
  } catch (error) {
    return {
      exitCode: 1,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}
