import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';

export async function runLinkCommand(
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
): Promise<CommandExecutionResult> {
  if (!command.packageRoot) {
    return {
      exitCode: 1,
      output: 'Usage: codegraphy plugins link <package-root>',
    };
  }

  const record = await dependencies.linkInstalledPluginPackage({
    homeDir: dependencies.homeDir,
    packageRoot: command.packageRoot,
  });

  return {
    exitCode: 0,
    output: `Linked ${record.package} from ${command.packageRoot} into ~/.codegraphy/plugins.json.`,
  };
}
