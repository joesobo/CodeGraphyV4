import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '../../../../src';
import { buildWorkspaceObservationPlan } from '../../../../src/indexing/liveUpdate/observation/plan';
import { createWorkspace } from '../../workspaceFixture';

describe('workspace observation plan', () => {
  it('does not create watch roots for default, Git, or Filter excluded trees', async () => {
    const workspaceRoot = await createWorkspace();
    execFileSync('git', ['init', '-q'], { cwd: workspaceRoot });
    await writeFile(join(workspaceRoot, '.gitignore'), 'ignored/**\n', 'utf-8');
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      filterPatterns: ['vendor/**/*'],
    });
    for (const directory of ['node_modules/package', 'ignored/generated', 'vendor/library', 'src']) {
      await mkdir(join(workspaceRoot, directory), { recursive: true });
    }

    const plan = await buildWorkspaceObservationPlan(workspaceRoot);

    expect(plan.directories).toContain(join(workspaceRoot, 'src'));
    expect(plan.directories).not.toContain(join(workspaceRoot, 'node_modules'));
    expect(plan.directories).not.toContain(join(workspaceRoot, 'ignored'));
    expect(plan.directories).not.toContain(join(workspaceRoot, 'vendor'));
  });
});
