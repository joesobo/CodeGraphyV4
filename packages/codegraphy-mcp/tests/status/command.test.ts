import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runStatusCommand } from '../../src/status/command';
import { createTempCodeGraphyHome } from '../support/database';

describe('status/command', () => {
  let homePath: string;
  let originalHome: string | undefined;
  let originalCwd: string;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    originalCwd = process.cwd();
    homePath = createTempCodeGraphyHome();
    process.env.CODEGRAPHY_HOME = homePath;
  });

  afterEach(() => {
    process.chdir(originalCwd);
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

  it('accepts relative repo paths such as dot', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(homePath, 'indexed-repo-'));
    const databaseDirectory = path.join(workspaceRoot, '.codegraphy');
    fs.mkdirSync(databaseDirectory, { recursive: true });
    fs.writeFileSync(path.join(databaseDirectory, 'graph.lbug'), '');
    process.chdir(workspaceRoot);
    const resolvedWorkspaceRoot = process.cwd();

    const result = runStatusCommand('.');

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(`repo: ${resolvedWorkspaceRoot}`);
    expect(result.output).toContain('status: indexed');
  });
});
