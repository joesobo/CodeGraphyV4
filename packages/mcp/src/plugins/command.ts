import * as path from 'node:path';
import {
  addCodeGraphyInstalledPlugin,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createBundledMarkdownInstalledPluginRecord,
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  linkCodeGraphyInstalledPluginPackage,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettingsOrInitial,
  refreshCodeGraphyInstalledPlugins,
  type AddCodeGraphyInstalledPluginOptions,
  type CodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
  type LinkCodeGraphyInstalledPluginPackageOptions,
  type RefreshCodeGraphyInstalledPluginsOptions,
} from '@codegraphy-dev/core';
import type { CommandExecutionResult } from '../run/command';
import type { CliCommand } from '../run/parse';
import { resolveNpmGlobalPackageRoots } from './globalPackages';

type PluginsCommandDependencies = {
  addInstalledPlugin(options: AddCodeGraphyInstalledPluginOptions): Promise<CodeGraphyInstalledPluginRecord>;
  cwd(): string;
  disableWorkspacePlugin(workspaceRoot: string, packageName: string): void;
  enableWorkspacePlugin(workspaceRoot: string, plugin: CodeGraphyInstalledPluginRecord): void;
  homeDir?: string;
  linkInstalledPlugin(options: LinkCodeGraphyInstalledPluginPackageOptions): Promise<CodeGraphyInstalledPluginRecord>;
  readInstalledPluginCache(options?: CodeGraphyUserStateOptions): CodeGraphyInstalledPluginCache;
  refreshInstalledPlugins(options: RefreshCodeGraphyInstalledPluginsOptions): Promise<CodeGraphyInstalledPluginCache>;
  resolveGlobalPackageRoots(): string[];
};

const DEFAULT_DEPENDENCIES: PluginsCommandDependencies = {
  addInstalledPlugin: addCodeGraphyInstalledPlugin,
  cwd: () => process.cwd(),
  disableWorkspacePlugin: disableCodeGraphyWorkspacePlugin,
  enableWorkspacePlugin: enableCodeGraphyWorkspacePlugin,
  linkInstalledPlugin: linkCodeGraphyInstalledPluginPackage,
  readInstalledPluginCache: readCodeGraphyInstalledPluginCache,
  refreshInstalledPlugins: refreshCodeGraphyInstalledPlugins,
  resolveGlobalPackageRoots: resolveNpmGlobalPackageRoots,
};

function createHelpResult(): CommandExecutionResult {
  return {
    exitCode: 0,
    output: [
      'CodeGraphy plugin commands',
      '',
      'Commands:',
      '  codegraphy plugins refresh',
      '  codegraphy plugins add <package>',
      '  codegraphy plugins link <package-root>',
      '  codegraphy plugins list [workspace]',
      '  codegraphy plugins enable <package> [workspace]',
      '  codegraphy plugins disable <package> [workspace]',
    ].join('\n'),
  };
}

function createMissingPackageRootResult(): CommandExecutionResult {
  return {
    exitCode: 1,
    output: 'Usage: codegraphy plugins link <package-root>',
  };
}

function resolveWorkspaceRoot(
  workspacePath: string | undefined,
  dependencies: Pick<PluginsCommandDependencies, 'cwd'>,
): string {
  return path.resolve(dependencies.cwd(), workspacePath ?? '.');
}

function formatPluginCount(count: number): string {
  return `${count} CodeGraphy ${count === 1 ? 'plugin' : 'plugins'}`;
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

function createMissingPackageResult(action: 'add' | 'disable' | 'enable'): CommandExecutionResult {
  return {
    exitCode: 1,
    output: `Usage: codegraphy plugins ${action} <package> [workspace]`,
  };
}

async function runRefreshCommand(
  dependencies: PluginsCommandDependencies,
): Promise<CommandExecutionResult> {
  const globalPackageRoots = dependencies.resolveGlobalPackageRoots();
  if (globalPackageRoots.length === 0) {
    return {
      exitCode: 1,
      output: 'Could not find the global npm package root. Confirm npm is installed, then retry.',
    };
  }

  const cache = await dependencies.refreshInstalledPlugins({
    homeDir: dependencies.homeDir,
    globalPackageRoots,
  });
  return {
    exitCode: 0,
    output: `Refreshed ${formatPluginCount(cache.plugins.length)} in ~/.codegraphy/plugins.json.`,
  };
}

async function runAddCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): Promise<CommandExecutionResult> {
  if (!command.packageName) {
    return createMissingPackageResult('add');
  }

  const globalPackageRoots = dependencies.resolveGlobalPackageRoots();
  if (globalPackageRoots.length === 0) {
    return {
      exitCode: 1,
      output: 'Could not find the global npm package root. Confirm npm is installed, then retry.',
    };
  }

  const record = await dependencies.addInstalledPlugin({
    homeDir: dependencies.homeDir,
    packageName: command.packageName,
    globalPackageRoots,
  });

  return {
    exitCode: 0,
    output: `Added ${record.package} to ~/.codegraphy/plugins.json.`,
  };
}

async function runLinkCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): Promise<CommandExecutionResult> {
  if (!command.packageRoot) {
    return createMissingPackageRootResult();
  }

  const packageRoot = path.resolve(dependencies.cwd(), command.packageRoot);
  const record = await dependencies.linkInstalledPlugin({
    homeDir: dependencies.homeDir,
    packageRoot,
  });

  return {
    exitCode: 0,
    output: `Linked ${record.package} from ${record.packageRoot} into ~/.codegraphy/plugins.json.`,
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
        `Run \`codegraphy plugins refresh\` or \`codegraphy plugins add ${command.packageName}\`, then retry.`,
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
      case 'refresh':
        return runRefreshCommand(mergedDependencies);
      case 'add':
        return runAddCommand(command, mergedDependencies);
      case 'link':
        return runLinkCommand(command, mergedDependencies);
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
