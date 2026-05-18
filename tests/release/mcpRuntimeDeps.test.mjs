import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readPackageJson(packageDir) {
  return JSON.parse(
    readFileSync(path.join(repoRoot, 'packages', packageDir, 'package.json'), 'utf8'),
  );
}

function isCoreRuntimeDependency(packageName) {
  return packageName === 'ignore'
    || packageName === 'minimatch'
    || packageName === '@driftlog/tree-sitter-dart'
    || packageName.startsWith('@tree-sitter-grammars/')
    || packageName.startsWith('tree-sitter');
}

test('MCP package declares core runtime dependencies used by the bundled CLI', () => {
  const coreDependencies = readPackageJson('core').dependencies;
  const mcpDependencies = readPackageJson('mcp').dependencies;

  for (const [packageName, version] of Object.entries(coreDependencies)) {
    if (!isCoreRuntimeDependency(packageName)) {
      continue;
    }

    assert.equal(
      mcpDependencies[packageName],
      version,
      `@codegraphy/mcp should depend on ${packageName} because the bundled CLI can import it at runtime`,
    );
  }
});
