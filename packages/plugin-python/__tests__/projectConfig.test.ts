import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { __test, loadPythonConfig } from '../src/projectConfig';

describe('loadPythonConfig', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-python-project-config-'));
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  function writeConfig(fileName: string, content: string): void {
    fs.writeFileSync(path.join(workspaceRoot, fileName), content, 'utf8');
  }

  it('returns empty source roots when config files are missing', async () => {
    const config = await loadPythonConfig(workspaceRoot);

    expect(config).toEqual({ sourceRoots: [], resolveInitFiles: true });
  });

  it('collects source roots from pyproject.toml', async () => {
    writeConfig('pyproject.toml', `
[tool.setuptools.packages.find]
where = ["backend", "backend"]

[tool.setuptools]
package-dir = {"" = "src"}

[tool.poetry]
packages = [{ include = "api", from = "vendor" }]
`);

    const config = await loadPythonConfig(workspaceRoot);

    expect(config.resolveInitFiles).toBe(true);
    expect(config.sourceRoots).toEqual(['backend', 'vendor', 'src']);
  });

  it('collects source roots from setup.cfg', async () => {
    writeConfig('setup.cfg', `
[options.packages.find]
where = api

[options]
package_dir =
    = app
`);

    const config = await loadPythonConfig(workspaceRoot);

    expect(config.resolveInitFiles).toBe(true);
    expect(config.sourceRoots).toEqual(['api', 'app']);
  });

  it('deduplicates roots discovered from multiple project files', async () => {
    writeConfig('pyproject.toml', `
[tool.setuptools.packages.find]
where = ["shared", "shared"]
`);

    writeConfig('setup.cfg', `
[options.packages.find]
where = shared
`);

    const config = await loadPythonConfig(workspaceRoot);

    expect(config.sourceRoots).toEqual(['shared']);
  });
});

describe('projectConfig helpers', () => {
  it('parses source roots from raw json safely', () => {
    expect(__test.parseSourceRootsFromRaw('not-json')).toEqual([]);
    expect(__test.parseSourceRootsFromRaw('{"roots":["src"]}')).toEqual([]);
    expect(__test.parseSourceRootsFromRaw('["src", ".", "app"]')).toEqual(['src', 'app']);
  });

  it('normalizes candidate source roots', () => {
    expect(__test.normalizeSourceRoot(' src// ')).toBe('src');
    expect(__test.normalizeSourceRoot('"backend"')).toBe('backend');
    expect(__test.normalizeSourceRoot('\\vendor\\lib\\')).toBe('/vendor/lib');
    expect(__test.normalizeSourceRoot('.')).toBeNull();
    expect(__test.normalizeSourceRoot('')).toBeNull();
  });

  it('preserves interior quote characters while trimming wrapping quotes', () => {
    expect(__test.normalizeSourceRoot(`"pkg'core"`)).toBe(`pkg'core`);
    expect(__test.normalizeSourceRoot(`pkg"core`)).toBe(`pkg"core`);
  });

  it('keeps unique valid source roots in insertion order', () => {
    expect(__test.sanitizeSourceRoots(['src', 'src/', '.', 1, 'backend'])).toEqual([
      'src',
      'backend',
    ]);
  });
});
