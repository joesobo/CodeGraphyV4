#!/usr/bin/env tsx

import { discoverMutationSeedJobMatrix, discoverMutationSeedJobs } from '../mutation/seed/jobs';
import { REPO_ROOT } from '../shared/resolve/repoRoot';

const jobs = discoverMutationSeedJobs(REPO_ROOT);
const matrixJobs = discoverMutationSeedJobMatrix(REPO_ROOT);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(matrixJobs));
} else {
  console.log(jobs.map(job => `${job.package}/${job.shard}`).join('\n'));
}
