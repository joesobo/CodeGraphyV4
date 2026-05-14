export interface CoverageProfile {
  coveragePath: string;
  cwd: string;
  env?: Record<string, string>;
  args: string[];
  command: string;
}

import {
  extensionCoverageProfile,
  qualityToolsCoverageProfile,
  workspacePackageCoverageProfile
} from './factories';

export function createCoverageProfiles(repoRoot: string, packageName?: string): CoverageProfile[] {
  if (packageName === 'quality-tools') {
    return [qualityToolsCoverageProfile(repoRoot)];
  }

  if (packageName === 'extension') {
    return [extensionCoverageProfile(repoRoot)];
  }

  if (packageName) {
    return [workspacePackageCoverageProfile(repoRoot, packageName)];
  }

  return [extensionCoverageProfile(repoRoot), qualityToolsCoverageProfile(repoRoot)];
}
