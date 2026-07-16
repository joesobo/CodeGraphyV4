import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const skillPath = path.join(repoRoot, 'skills', 'codegraphy', 'SKILL.md');

test('the generalized CodeGraphy skill exposes the complete CLI workflow', () => {
  const skill = readFileSync(skillPath, 'utf8');

  assert.match(skill, /^name: codegraphy$/m);
  assert.match(skill, /codegraphy index \./);
  for (const report of ['nodes', 'edges', 'relationships', 'symbols', 'paths']) {
    assert.match(skill, new RegExp(`codegraphy query ${report}`));
  }
  assert.doesNotMatch(skill, /MCP|graph\.lbug/);
});

test('the old MCP package and skill are absent from the release source', () => {
  assert.equal(existsSync(path.join(repoRoot, 'packages', 'mcp', 'package.json')), false);
  assert.equal(existsSync(path.join(repoRoot, 'skills', 'codegraphy-mcp', 'SKILL.md')), false);
  assert.equal(existsSync(path.join(repoRoot, 'docs', 'MCP.md')), false);
});

test('the documented install source uses the standard Skills CLI repository form', () => {
  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');

  assert.match(readme, /npx skills@latest add codegraphy\/skills/);
});
