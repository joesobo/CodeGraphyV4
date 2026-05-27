import * as os from 'node:os';
import * as path from 'node:path';

export function getCodeGraphyUserDirectoryPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.codegraphy');
}

export function getInstalledPluginsCachePath(homeDir: string = os.homedir()): string {
  return path.join(getCodeGraphyUserDirectoryPath(homeDir), 'plugins.json');
}

export function getCodeGraphyUserSettingsPath(homeDir: string = os.homedir()): string {
  return path.join(getCodeGraphyUserDirectoryPath(homeDir), 'settings.json');
}

export function getGlobalPackageRootPackagePath(globalPackageRoot: string, packageName: string): string {
  return path.join(globalPackageRoot, ...packageName.split('/'));
}
