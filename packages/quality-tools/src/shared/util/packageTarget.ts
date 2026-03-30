import { type WorkspacePackage } from './workspacePackages';

export function findContainingPackage(
  absolutePath: string,
  workspacePackages: WorkspacePackage[]
): WorkspacePackage | undefined {
  return workspacePackages.find((workspacePackage) => (
    absolutePath === workspacePackage.root || absolutePath.startsWith(`${workspacePackage.root}/`)
  ));
}
