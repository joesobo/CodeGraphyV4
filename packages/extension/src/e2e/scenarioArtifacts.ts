import * as fs from 'fs';
import * as path from 'path';

export function cleanupScenarioArtifacts(workspacePath: string, hadGitignore: boolean): void {
  fs.rmSync(path.join(workspacePath, '.codegraphy'), { recursive: true, force: true });
  if (!hadGitignore) fs.rmSync(path.join(workspacePath, '.gitignore'), { force: true });
}

export function maybeCleanupScenarioArtifacts(
  workspacePath: string,
  hadGitignore: boolean,
  preserve: boolean,
): void {
  if (!preserve) cleanupScenarioArtifacts(workspacePath, hadGitignore);
}
