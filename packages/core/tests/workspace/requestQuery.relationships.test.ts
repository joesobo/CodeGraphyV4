import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';

describe('workspace/requestQuery', () => {
  it('uses complete graph scope for an exact targeted Relationship query', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-target-scope-'));
    await fs.writeFile(path.join(workspaceRoot, 'dependency.ts'), [
      'export function readSetting(): string {',
      "  return 'value';",
      '}',
      '',
    ].join('\n'));
    await fs.writeFile(path.join(workspaceRoot, 'entry.ts'), [
      "import { readSetting } from './dependency';",
      'export function runCommand(): string {',
      '  return readSetting();',
      '}',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    for (const projection of [undefined, { edgeTypes: ['call'] }]) {
      const result = await requestWorkspaceGraphQuery({
        workspacePath: workspaceRoot,
        report: 'edges',
        arguments: {
          from: 'entry.ts#runCommand:function',
          edgeType: 'call',
          limit: 20,
        },
        ...(projection ? { projection } : {}),
      });

      expect(result.edges).toEqual([{
        from: 'entry.ts#runCommand:function',
        to: 'dependency.ts#readSetting:function',
        edgeTypes: ['call'],
      }]);
    }
  });

  it('resolves targeted calls through named re-export barrels', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-reexport-'));
    await fs.writeFile(path.join(workspaceRoot, 'storage.ts'), [
      'export function readSetting(): string {',
      "  return 'value';",
      '}',
      '',
    ].join('\n'));
    await fs.writeFile(
      path.join(workspaceRoot, 'settings.ts'),
      "export { readSetting } from './storage';\n",
    );
    await fs.writeFile(path.join(workspaceRoot, 'entry.ts'), [
      "import { readSetting } from './settings';",
      'export function runCommand(): string {',
      '  return readSetting();',
      '}',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: {
        from: 'entry.ts#runCommand:function',
        edgeType: 'call',
        limit: 20,
      },
      projection: { edgeTypes: ['call'] },
    });

    expect(result.edges).toEqual([{
      from: 'entry.ts#runCommand:function',
      to: 'storage.ts#readSetting:function',
      edgeTypes: ['call'],
    }]);

    const reexports = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: {
        from: 'settings.ts',
        edgeType: 'reexport',
        limit: 20,
      },
      projection: { edgeTypes: ['reexport'] },
    });
    expect(reexports.edges).toEqual([{
      from: 'settings.ts',
      to: 'storage.ts#readSetting:function',
      edgeTypes: ['reexport'],
    }]);
  });
});
