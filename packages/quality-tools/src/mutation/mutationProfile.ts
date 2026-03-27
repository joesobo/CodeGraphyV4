import { type QualityTarget } from '../shared/resolveTarget';

export interface MutationProfile {
  configPath: string;
  packageName: string;
}

export { discoverMutationPackageNames } from './mutationPackages';

export function resolveMutationProfile(target: QualityTarget): MutationProfile {
  if (!target.packageName) {
    throw new Error('Mutation targets must resolve to a workspace package.');
  }

  const packageConfig = target.packageName === 'quality-tools'
    ? 'packages/quality-tools/stryker.config.json'
    : 'stryker.config.json';
  return { configPath: packageConfig, packageName: target.packageName };
}
