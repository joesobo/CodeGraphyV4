import { describe, it, expect, beforeEach } from 'vitest';
import { createPythonPlugin } from '../src';
import * as path from 'path';
import * as os from 'os';

describe('Python plugin ruleId', () => {
  const plugin = createPythonPlugin();
  const workspaceRoot = os.tmpdir();

  beforeEach(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('sets standard-import ruleId for import statements', async () => {
    const content = `import os`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.py'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('standard-import');
  });

  it('sets from-import ruleId for from-import statements', async () => {
    const content = `from os import path`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.py'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('from-import');
  });

  it('every connection has a ruleId', async () => {
    const content = `import os\nfrom sys import argv`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.py'), content, workspaceRoot
    );
    for (const conn of connections) {
      expect(conn.ruleId).toBeDefined();
    }
  });
});
