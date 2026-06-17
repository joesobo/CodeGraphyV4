import * as os from 'node:os';
import * as path from 'node:path';

function getDefaultCodeGraphyHomeDir(): string {
  return process.env.CODEGRAPHY_HOME || os.homedir();
}

export function getCodeGraphyUserDirectoryPath(homeDir: string = getDefaultCodeGraphyHomeDir()): string {
  return path.join(homeDir, '.codegraphy');
}

export function getInstalledPluginsCachePath(homeDir: string = getDefaultCodeGraphyHomeDir()): string {
  return path.join(getCodeGraphyUserDirectoryPath(homeDir), 'plugins.json');
}

export function getCodeGraphyUserSettingsPath(homeDir: string = getDefaultCodeGraphyHomeDir()): string {
  return path.join(getCodeGraphyUserDirectoryPath(homeDir), 'settings.json');
}

export function getGlobalPackageRootPackagePath(globalPackageRoot: string, packageName: string): string {
  return path.join(globalPackageRoot, ...packageName.split('/'));
}
