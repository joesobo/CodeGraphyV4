import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const skillPath = path.join(repoRoot, 'skills', 'codegraphy', 'SKILL.md');

test('the CodeGraphy skill covers the shipped CLI capabilities and machine contract', () => {
  const skill = readFileSync(skillPath, 'utf8');

  assert.match(skill, /^name: codegraphy$/m);
  for (const command of [
    'index',
    'watch',
    'filter',
    'nodes',
    'search',
    'map',
    'query',
    'impact',
    'edges',
    'dependencies',
    'dependents',
    'path',
  ]) {
    assert.match(skill, new RegExp(`\\b${command}\\b`));
  }
  for (const concept of [
    'Relationship Graph',
    'Graph Cache',
    'live source',
    'Graph Scope',
    'pagination',
    'stdout',
    'stale',
    'JSON Lines',
    'explicit Index or Re-index Workspace',
  ]) {
    assert.match(skill, new RegExp(concept, 'i'));
  }
  assert.match(skill, /codegraphy --help/);
  assert.match(skill, /codegraphy <command> --help/);
});

test('the old MCP package and skill are absent from the release source', () => {
  assert.equal(existsSync(path.join(repoRoot, 'packages', 'mcp', 'package.json')), false);
  assert.equal(existsSync(path.join(repoRoot, 'skills', 'codegraphy-mcp', 'SKILL.md')), false);
  assert.equal(existsSync(path.join(repoRoot, 'docs', 'MCP.md')), false);
});

test('the documented install source matches the currently available local skill', () => {
  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');

  assert.match(readme, /npx skills@latest add \.\/skills\/codegraphy/);
  assert.doesNotMatch(readme, /npx skills@latest add codegraphy\/skills/);
});
