export interface CoverageProfile {
  coveragePath: string;
  cwd: string;
  args: string[];
  command: string;
}

import {
  extensionCoverageProfile,
  qualityToolsCoverageProfile
} from './coverageProfileFactories';

export function createCoverageProfiles(repoRoot: string, packageName?: string): CoverageProfile[] {
  if (packageName === 'quality-tools') {
    return [qualityToolsCoverageProfile(repoRoot)];
  }

  if (packageName) {
    return [extensionCoverageProfile(repoRoot)];
  }

  return [extensionCoverageProfile(repoRoot), qualityToolsCoverageProfile(repoRoot)];
}
