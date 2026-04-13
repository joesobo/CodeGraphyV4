import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { e2eScenarios } from '../../../src/e2e/scenarios';

const repoRoot = path.resolve(__dirname, '../../../../../');

describe('extension e2e scenarios', () => {
  it('points each scenario at a real example workspace', () => {
    for (const scenario of e2eScenarios) {
      const workspacePath = path.join(repoRoot, scenario.workspaceRelativePath);
      expect(fs.existsSync(workspacePath)).toBe(true);
    }
  });
});
