import * as fs from 'node:fs';
import * as os from 'node:os';
import { getCodeGraphyUserDirectoryPath } from '../../plugins/installedCache';

export interface SetupCommandResult {
  exitCode: number;
  output: string;
}

interface SetupCommandDependencies {
  ensureDirectory(path: string): void;
  homeDir(): string;
}

const DEFAULT_DEPENDENCIES: SetupCommandDependencies = {
  ensureDirectory: directoryPath => fs.mkdirSync(directoryPath, { recursive: true }),
  homeDir: () => process.env.CODEGRAPHY_HOME || os.homedir(),
};

export function runSetupCommand(
  dependencies: SetupCommandDependencies = DEFAULT_DEPENDENCIES,
): SetupCommandResult {
  const codegraphyDirectory = getCodeGraphyUserDirectoryPath(dependencies.homeDir());
  dependencies.ensureDirectory(codegraphyDirectory);

  return {
    exitCode: 0,
    output: `Prepared CodeGraphy user directory at ${codegraphyDirectory}.`,
  };
}
