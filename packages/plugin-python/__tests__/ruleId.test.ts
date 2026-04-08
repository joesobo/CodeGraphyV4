import { describe, it, expect, beforeEach } from 'vitest';
import { createPythonPlugin } from '../src/plugin';
import * as path from 'path';
import * as os from 'os';

describe('Python plugin sourceId', () => {
  const plugin = createPythonPlugin();
  const workspaceRoot = os.tmpdir();

  beforeEach(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('sets import-module sourceId for import statements', async () => {
    const content = `import os`;
    const relations = (await plugin.analyzeFile?.(
      path.join(workspaceRoot, 'test.py'), content, workspaceRoot
    ))?.relations ?? [];
    expect(relations.length).toBeGreaterThan(0);
    expect(relations[0].kind).toBe('import');
    expect(relations[0].sourceId).toBe('import-module');
  });

  it('sets from-import-absolute sourceId for absolute from-import statements', async () => {
    const content = `from os import path`;
    const relations = (await plugin.analyzeFile?.(
      path.join(workspaceRoot, 'test.py'), content, workspaceRoot
    ))?.relations ?? [];
    expect(relations.length).toBeGreaterThan(0);
    expect(relations[0].kind).toBe('import');
    expect(relations[0].sourceId).toBe('from-import-absolute');
  });

  it('sets from-import-relative sourceId for relative from-import statements', async () => {
    const content = `from .utils import helper`;
    const relations = (await plugin.analyzeFile?.(
      path.join(workspaceRoot, 'pkg', 'test.py'), content, workspaceRoot
    ))?.relations ?? [];
    expect(relations.length).toBeGreaterThan(0);
    expect(relations[0].kind).toBe('import');
    expect(relations[0].sourceId).toBe('from-import-relative');
  });

  it('every relation has a sourceId and kind', async () => {
    const content = `import os\nfrom sys import argv`;
    const relations = (await plugin.analyzeFile?.(
      path.join(workspaceRoot, 'test.py'), content, workspaceRoot
    ))?.relations ?? [];
    for (const conn of relations) {
      expect(conn.sourceId).toBeDefined();
      expect(conn.kind).toBeDefined();
    }
  });
});
