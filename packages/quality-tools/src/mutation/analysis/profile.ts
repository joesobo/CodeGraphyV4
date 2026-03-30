import { type QualityTarget } from '../../shared/resolve/target';

export interface MutationProfile {
  configPath: string;
  packageName: string;
}

export { discoverMutationPackageNames } from './packages';

export function resolveMutationProfile(target: QualityTarget): MutationProfile {
  if (!target.packageName) {
    throw new Error('Mutation targets must resolve to a workspace package.');
  }

  const packageConfig = target.packageName === 'extension'
    ? 'packages/extension/stryker.config.cjs'
    : target.packageName === 'quality-tools'
      ? 'packages/quality-tools/stryker.config.json'
      : 'stryker.config.cjs';
  return { configPath: packageConfig, packageName: target.packageName };
}
