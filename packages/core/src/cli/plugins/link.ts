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

  const records = await dependencies.linkInstalledPluginPackage({
    homeDir: dependencies.homeDir,
    packageRoot: command.packageRoot,
  });

  return {
    exitCode: 0,
    output: `Linked ${records.length} plugin${records.length === 1 ? '' : 's'} from ${command.packageRoot} into ~/.codegraphy/plugins.json.`,
  };
}
