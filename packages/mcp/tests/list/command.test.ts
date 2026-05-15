import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runListCommand } from '../../src/list/command';
import { setActiveRepo, upsertRepoRegistryEntry } from '../../src/repoRegistry/file';

describe('list/command', () => {
  let homePath: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    homePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-home-'));
    process.env.CODEGRAPHY_HOME = homePath;
  });

  afterEach(() => {
    process.env.CODEGRAPHY_HOME = originalHome;
    fs.rmSync(homePath, { recursive: true, force: true });
  });

  it('prints registered repos without status or freshness concepts', () => {
    upsertRepoRegistryEntry({
      workspaceRoot: '/workspace/project',
      databasePath: '/workspace/project/.codegraphy/graph.lbug',
      lastSeenAt: '2026-04-30T00:00:00.000Z',
    });
    setActiveRepo('/workspace/project');

    const result = runListCommand();

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe('*\t/workspace/project');
  });
});
