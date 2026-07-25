import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const skillPath = path.join(repoRoot, 'skills', 'codegraphy', 'SKILL.md');

test('the generalized CodeGraphy skill teaches the lifecycle and delegates syntax to CLI help', () => {
  const skill = readFileSync(skillPath, 'utf8');

  assert.match(skill, /^name: codegraphy$/m);
  const lifecycle = ['codegraphy index', 'codegraphy filter', 'Query with'];
  const lifecyclePositions = lifecycle.map(term => skill.indexOf(term));
  assert.ok(lifecyclePositions.every(position => position >= 0));
  assert.deepEqual(lifecyclePositions, [...lifecyclePositions].sort((left, right) => left - right));
  for (const command of ['nodes', 'search', 'map', 'query', 'edges', 'dependencies', 'dependents', 'path']) {
    assert.match(skill, new RegExp(`\\b${command}\\b`));
  }
  assert.match(skill, /codegraphy --help/);
  assert.match(skill, /codegraphy <command> --help/);
  assert.doesNotMatch(skill, /MCP|graph\.lbug/);
});

test('the CodeGraphy skill explains the tool without prescribing an agent workflow', () => {
  const skill = readFileSync(skillPath, 'utf8');

  for (const concept of [
    'Relationship Graph',
    'Graph Cache',
    'live source',
    'cached',
    'Graph Scope',
    'fuzzy',
    'pagination',
    'stdout',
    'stale',
  ]) {
    assert.match(skill, new RegExp(concept, 'i'));
  }
  assert.doesNotMatch(skill, /Token-bounded navigation policy/i);
  assert.doesNotMatch(skill, /(?:at most|no more than|normally make)\s+(?:one|two|three|\d+)\s+CodeGraphy calls?/i);
  assert.doesNotMatch(skill, /(?:second and final|a third is allowed|commands launched concurrently count)/i);
  assert.doesNotMatch(skill, /(?:never submit|one domain word|task literals|after one empty or refined search)/i);
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
