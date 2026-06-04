#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2).filter((arg) => arg !== '--');

const result = spawnSync('pnpm', ['--silent', 'exec', 'quality-tools', 'organize', ...args], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
