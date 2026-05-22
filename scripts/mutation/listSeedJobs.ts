#!/usr/bin/env tsx

import { discoverMutationSeedJobMatrix, discoverMutationSeedJobs } from './seedJobs';
import { REPO_ROOT } from './paths';

const jobs = discoverMutationSeedJobs(REPO_ROOT);
const matrixJobs = discoverMutationSeedJobMatrix(REPO_ROOT);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(matrixJobs));
} else {
  console.log(jobs.map((job) => `${job.package}/${job.shard}`).join('\n'));
}
