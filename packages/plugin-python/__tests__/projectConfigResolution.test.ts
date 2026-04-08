import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createPythonPlugin } from '../src/plugin';

describe('Python plugin project config source roots', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-python-config-'));
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  function writeFile(relativePath: string, content: string): string {
    const fullPath = path.join(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    return fullPath;
  }

  async function detect(mainRelativePath: string): Promise<ReturnType<Awaited<ReturnType<typeof createPythonPlugin>>['detectConnections']>> {
    const plugin = createPythonPlugin();
    await plugin.initialize?.(workspaceRoot);

    const mainPath = path.join(workspaceRoot, mainRelativePath);
    const content = fs.readFileSync(mainPath, 'utf8');
    return plugin.detectConnections(mainPath, content, workspaceRoot);
  }

  it('resolves imports from source roots declared in pyproject.toml', async () => {
    writeFile('pyproject.toml', `
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["backend"]
`);

    writeFile('backend/pkg/mod.py', 'VALUE = 1\n');
    writeFile('backend/main.py', 'from pkg import mod\n');

    const connections = await detect('backend/main.py');
    const connection = connections.find(
      (candidate) => candidate.specifier.includes('from pkg import mod') && candidate.resolvedPath !== null
    );

    expect(connection?.resolvedPath).toBe(path.join(workspaceRoot, 'backend/pkg/mod.py'));
  });

  it('resolves imports from source roots declared in setup.cfg', async () => {
    writeFile('setup.cfg', `
[metadata]
name = demo

[options.packages.find]
where = backend
`);

    writeFile('backend/pkg/mod.py', 'VALUE = 1\n');
    writeFile('backend/main.py', 'from pkg import mod\n');

    const connections = await detect('backend/main.py');
    const connection = connections.find(
      (candidate) => candidate.specifier.includes('from pkg import mod') && candidate.resolvedPath !== null
    );

    expect(connection?.resolvedPath).toBe(path.join(workspaceRoot, 'backend/pkg/mod.py'));
  });
});
