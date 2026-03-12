import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createPythonPlugin } from '../src';

describe('Python plugin from-import resolution', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-python-plugin-'));
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

  it('resolves "from pkg import module" to pkg/module.py when local module exists', async () => {
    writeFile('pkg/__init__.py', '');
    writeFile('pkg/module.py', 'VALUE = 1\n');
    const mainPath = writeFile('main.py', 'from pkg import module\n');

    const plugin = createPythonPlugin();
    await plugin.initialize?.(workspaceRoot);

    const content = fs.readFileSync(mainPath, 'utf8');
    const connections = await plugin.detectConnections(mainPath, content, workspaceRoot);

    const moduleConn = connections.find(
      c => c.specifier.includes('from pkg import module') && c.resolvedPath !== null,
    );

    expect(moduleConn?.resolvedPath).toBe(path.join(workspaceRoot, 'pkg/module.py'));
  });

  it('resolves local namespace package imports without requiring __init__.py', async () => {
    writeFile('src/ns_pkg/member.py', 'VALUE = 1\n');
    const mainPath = writeFile('src/main.py', 'from ns_pkg import member\n');

    const plugin = createPythonPlugin();
    await plugin.initialize?.(workspaceRoot);

    const content = fs.readFileSync(mainPath, 'utf8');
    const connections = await plugin.detectConnections(mainPath, content, workspaceRoot);

    const namespaceConn = connections.find(
      c => c.specifier.includes('from ns_pkg import member') && c.resolvedPath !== null,
    );

    expect(namespaceConn?.resolvedPath).toBe(path.join(workspaceRoot, 'src/ns_pkg/member.py'));
  });

  it('keeps unresolved third-party imports as unresolved (no local edge target)', async () => {
    const mainPath = writeFile('main.py', 'from requests import Session\n');

    const plugin = createPythonPlugin();
    await plugin.initialize?.(workspaceRoot);

    const content = fs.readFileSync(mainPath, 'utf8');
    const connections = await plugin.detectConnections(mainPath, content, workspaceRoot);

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('from requests import Session');
    expect(connections[0].resolvedPath).toBeNull();
  });
});
