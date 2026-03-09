import { describe, it, expect, beforeEach } from 'vitest';
import { createTypeScriptPlugin } from '../../../src/plugins/typescript';
import * as path from 'path';
import * as os from 'os';

describe('TypeScript plugin ruleId', () => {
  const plugin = createTypeScriptPlugin();
  const workspaceRoot = os.tmpdir();

  beforeEach(async () => {
    await plugin.initialize?.(workspaceRoot);
  });

  it('sets es6-import ruleId for static imports', async () => {
    const content = `import { foo } from './bar';`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('es6-import');
  });

  it('sets dynamic-import ruleId for dynamic imports', async () => {
    const content = `const mod = import('./bar');`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('dynamic-import');
  });

  it('sets commonjs-require ruleId for require calls', async () => {
    const content = `const foo = require('./bar');`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('commonjs-require');
  });

  it('sets reexport ruleId for re-exports', async () => {
    const content = `export { foo } from './bar';`;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    expect(connections.length).toBeGreaterThan(0);
    expect(connections[0].ruleId).toBe('reexport');
  });

  it('every connection has a ruleId set', async () => {
    const content = `
      import { a } from './a';
      const b = require('./b');
      export { c } from './c';
      const d = import('./d');
    `;
    const connections = await plugin.detectConnections(
      path.join(workspaceRoot, 'test.ts'), content, workspaceRoot
    );
    for (const conn of connections) {
      expect(conn.ruleId).toBeDefined();
      expect(typeof conn.ruleId).toBe('string');
    }
  });
});
