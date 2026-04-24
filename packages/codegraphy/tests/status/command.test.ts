import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runStatusCommand } from '../../src/status/command';
import { createTempCodeGraphyHome } from '../support/database';

describe('status/command', () => {
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

  it('returns a warning and non-zero exit code when the database is missing', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(homePath, 'missing-repo-'));

    const result = runStatusCommand(workspaceRoot);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('status: missing');
    expect(result.output).toContain('warning:');
  });
});
