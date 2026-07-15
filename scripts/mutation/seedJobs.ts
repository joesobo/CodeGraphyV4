import type { MutationSeedJob, MutationSeedJobMatrixEntry } from './contracts';
import { extensionHostMutationSeedJobs } from './extensionHostJobs';
import { extensionWebviewMutationSeedJob } from './extensionWebviewJob';
import { createPackageMutationSeedJob, discoverMutationPackageNames } from './packageJobs';

export type { MutationSeedJob, MutationSeedJobMatrixEntry } from './contracts';
export { discoverMutationPackageNames } from './packageJobs';

export const extensionMutationSeedJobs: MutationSeedJob[] = [
  ...extensionHostMutationSeedJobs,
  extensionWebviewMutationSeedJob,
];

export function discoverMutationSeedJobs(repoRoot: string): MutationSeedJob[] {
  return discoverMutationPackageNames(repoRoot).flatMap(packageName => (
    packageName === 'extension'
      ? extensionMutationSeedJobs
      : [createPackageMutationSeedJob(packageName)]
  ));
}

export function discoverMutationSeedJobMatrix(repoRoot: string): MutationSeedJobMatrixEntry[] {
  return discoverMutationSeedJobs(repoRoot).map(job => ({
    package: job.package,
    shard: job.shard,
  }));
}

export function findMutationSeedJob(
  repoRoot: string,
  packageName: string,
  shard: string,
): MutationSeedJob {
  const job = discoverMutationSeedJobs(repoRoot)
    .find(candidate => candidate.package === packageName && candidate.shard === shard);
  if (!job) throw new Error(`Unknown mutation seed job: ${packageName}/${shard}`);
  return job;
}
