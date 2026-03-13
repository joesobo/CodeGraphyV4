#!/usr/bin/env tsx

import { execSync } from 'child_process';

const pkg = process.argv[2];

execSync('pnpm --filter @codegraphy/extension exec vitest run --coverage', {
	stdio: 'inherit',
});

if (pkg) {
	execSync(`tsx scripts/check-crap.ts --filter packages/${pkg}/src`, {
		stdio: 'inherit',
	});
} else {
	execSync('tsx scripts/check-crap.ts', { stdio: 'inherit' });
}
