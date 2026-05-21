#!/usr/bin/env tsx

import { discoverMutationPackageNames } from '../mutation/analysis/profile';
import { REPO_ROOT } from '../shared/resolve/repoRoot';

const packageNames = discoverMutationPackageNames(REPO_ROOT);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(packageNames));
} else {
  console.log(packageNames.join('\n'));
}
