import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');

function readWorkspacePackageNames(): string[] {
  return readdirSync(path.join(repoRoot, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(repoRoot, 'packages', entry.name, 'package.json'))
    .filter((packageJsonPath) => existsSync(packageJsonPath))
    .map((packageJsonPath) => JSON.parse(readFileSync(packageJsonPath, 'utf8')).name);
}

describe('public Pro package boundary', () => {
  it('keeps login and account access out of the public monorepo packages', () => {
    expect(existsSync(path.join(repoRoot, 'packages', 'pro', 'package.json'))).toBe(false);
    expect(readWorkspacePackageNames()).not.toContain('@codegraphy/pro');
  });
});
