export function isWorkspaceDiscoveryLifecyclePath(workspacePath: string): boolean {
  return workspacePath === '.codegraphy/settings.json'
    || workspacePath === '.git/index'
    || workspacePath === '.git/info/exclude'
    || workspacePath.split('/').at(-1) === '.gitignore';
}
