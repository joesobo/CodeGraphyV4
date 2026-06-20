#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const SPEC_PATHSPEC = 'packages/extension/tests/acceptance/specs/**/*.md';
const SPEC_PATH_PATTERN = /^packages\/extension\/tests\/acceptance\/specs\/.+\.md$/;

if (!isCodexSession() || process.env.ALLOW_ACCEPTANCE_SPEC_EDITS === '1') {
  process.exit(0);
}

const changedSpecs = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((file) => SPEC_PATH_PATTERN.test(file));

if (changedSpecs.length === 0) {
  process.exit(0);
}

console.error([
  'Acceptance spec Markdown is human-owned.',
  'Agents must not create, edit, rename, or delete files under:',
  `  ${SPEC_PATHSPEC}`,
  '',
  'Changed spec files:',
  ...changedSpecs.map((file) => `  - ${file}`),
  '',
  'Only use ALLOW_ACCEPTANCE_SPEC_EDITS=1 for an explicit user-authorized spec change.',
].join('\n'));

process.exit(1);

function isCodexSession() {
  return Boolean(process.env.CODEX_CI || process.env.CODEX_SHELL || process.env.CODEX_THREAD_ID);
}
