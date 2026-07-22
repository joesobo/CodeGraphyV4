import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { E2EScenario } from './scenarios';

export interface ScenarioProfile {
  extensionDevelopmentPath: string[];
  extensionsPath: string;
  hadGitignore: boolean;
  homeDir: string;
  profilePath: string;
  userDataPath: string;
  workspacePath: string;
}

export function createScenarioProfile(
  repoRoot: string,
  scenario: E2EScenario,
): ScenarioProfile {
  const profilePath = fs.mkdtempSync(
    path.join(os.tmpdir(), `codegraphy-e2e-${scenario.name.replace(/[^a-z0-9-]/gi, '-')}-`),
  );
  const workspacePath = path.resolve(repoRoot, scenario.workspaceRelativePath);
  return {
    extensionDevelopmentPath: [
      repoRoot,
      ...scenario.pluginDevelopmentRelativePaths.map(relativePath => (
        path.resolve(repoRoot, relativePath)
      )),
    ],
    extensionsPath: path.join(profilePath, 'e'),
    hadGitignore: fs.existsSync(path.join(workspacePath, '.gitignore')),
    homeDir: path.join(profilePath, 'home'),
    profilePath,
    userDataPath: path.join(profilePath, 'u'),
    workspacePath,
  };
}
