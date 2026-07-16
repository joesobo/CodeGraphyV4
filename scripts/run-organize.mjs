#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(
  'pnpm',
  ['--silent', 'exec', 'quality-tools', 'organize', ...args],
  { cwd: repoRoot, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
