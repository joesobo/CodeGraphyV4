import * as fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runListCommand } from '../../src/list/command';
import { readRepoStatus } from '../../src/repoStatus/read';
import { createTempCodeGraphyHome, createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('list/command', () => {
  let homePath: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    homePath = createTempCodeGraphyHome();
    process.env.CODEGRAPHY_HOME = homePath;
  });

  afterEach(() => {
    process.env.CODEGRAPHY_HOME = originalHome;
    fs.rmSync(homePath, { recursive: true, force: true });
  });

  it('prints registered repos with status', () => {
    const repo = createTempRepo(createSampleSnapshot());
    readRepoStatus(repo.workspaceRoot);

    const result = runListCommand();

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('indexed');
    expect(result.output).toContain(repo.workspaceRoot);
  });
});
