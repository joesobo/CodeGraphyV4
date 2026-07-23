import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import type { PluginsCommandDependencies } from './dependencies';
import { createMissingPackageResult } from './help';

export async function runRegisterCommand(
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

  const records = await dependencies.registerInstalledPlugin({
    homeDir: dependencies.homeDir,
    packageName: command.packageName,
    globalPackageRoots,
  });

  return {
    exitCode: 0,
    output: `Registered ${records.length} plugin${records.length === 1 ? '' : 's'} from ${command.packageName} in ~/.codegraphy/plugins.json.`,
  };
}
