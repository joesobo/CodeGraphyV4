import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listRegisteredRepoStatuses, readRepoStatus } from '../../src/repoStatus/read';
import { createTempCodeGraphyHome, createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('repoStatus/read', () => {
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

  it('marks repos with a database as indexed and registers them', () => {
    const repo = createTempRepo(createSampleSnapshot());

    const status = readRepoStatus(repo.workspaceRoot);

    expect(status.status).toBe('indexed');
    expect(status.registered).toBe(true);
    expect(listRegisteredRepoStatuses()).toHaveLength(1);
  });

  it('returns setup guidance for repos without a database', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(homePath, 'missing-repo-'));

    const status = readRepoStatus(workspaceRoot);

    expect(status.status).toBe('missing');
    expect(status.warning).toContain('Open the repo in VS Code');
  });
});
