import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const workflowDir = path.join(process.cwd(), '.github', 'workflows');

const node20HostedActions = new Map([
  ['actions/checkout', 6],
  ['actions/setup-node', 6],
  ['pnpm/action-setup', 6],
]);

function parseMajor(ref) {
  const versionMatch = /^v(\d+)(?:\.|$)/.exec(ref);
  return versionMatch ? Number(versionMatch[1]) : null;
}

test('GitHub workflows use Node 24-compatible action runtime versions', () => {
  const failures = [];

  for (const fileName of readdirSync(workflowDir)) {
    if (!fileName.endsWith('.yml') && !fileName.endsWith('.yaml')) {
      continue;
    }

    const workflowPath = path.join(workflowDir, fileName);
    const workflow = readFileSync(workflowPath, 'utf8');
    const actionReferencePattern = /uses:\s*([^\s@]+)@([^\s#]+)/g;

    for (const match of workflow.matchAll(actionReferencePattern)) {
      const [, action, ref] = match;
      const minimumMajor = node20HostedActions.get(action);
      const major = parseMajor(ref);

      if (minimumMajor === undefined || major === null || major >= minimumMajor) {
        continue;
      }

      failures.push(`${fileName}: ${action}@${ref} must be at least v${minimumMajor}`);
    }
  }

  assert.deepEqual(failures, []);
});
