import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCliCommand } from '../../src/cli/command';

describe('cli/command', () => {
  it('dispatches help and plugin help without touching a workspace', async () => {
    await expect(runCliCommand({ name: 'setup' })).resolves.toMatchObject({ exitCode: 0 });
    await expect(runCliCommand({ name: 'help' })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('CodeGraphy CLI'),
    });
    await expect(runCliCommand({ name: 'plugins', action: 'help' })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('codegraphy plugins register'),
    });
  });

  it('reports the installed Core package version', async () => {
    await expect(runCliCommand({ name: 'version' })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringMatching(/^\d+\.\d+\.\d+(?:[-+].+)?$/),
    });
  });

  it('reports concise command-scoped help', async () => {
    await expect(runCliCommand({ name: 'help', helpPath: ['index'] })).resolves.toEqual({
      exitCode: 0,
      output: 'Usage: codegraphy index [workspace]',
    });
    await expect(runCliCommand({ name: 'help', helpPath: ['edges'] })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('Usage: codegraphy edges [workspace]'),
    });
    await expect(runCliCommand({ name: 'help', helpPath: ['plugins', 'enable'] })).resolves.toEqual({
      exitCode: 0,
      output: 'Usage: codegraphy plugins enable <plugin-id-or-package> [workspace]',
    });
  });

  it('dispatches status and index commands for an explicit workspace', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-cli-command-'));

    await expect(runCliCommand({ name: 'status', workspacePath: workspaceRoot })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('CodeGraphy Workspace Graph Cache is missing'),
    });
    await expect(runCliCommand({ name: 'index', workspacePath: workspaceRoot })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('CodeGraphy indexing completed'),
    });
  });

  it('emits verbose diagnostics outside command output', async () => {
    const diagnostics: string[] = [];

    const result = await runCliCommand(
      { name: 'status', verbose: true, workspacePath: '/workspace/project' },
      {
        writeDiagnostic: line => diagnostics.push(line),
      },
    );

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot: '/workspace/project',
    });
    expect(diagnostics).toContain(
      '[CodeGraphy] Starting command: status, workspace=/workspace/project',
    );
    expect(diagnostics).toContain(
      '[CodeGraphy] Command complete: status, exitCode=0',
    );
  });

  it('queries the indexed Graph Cache through compact JSON CLI reports', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-cli-query-'));
    await writeFile(join(workspaceRoot, 'Home.md'), 'See [[Target.md]].\n');
    await writeFile(join(workspaceRoot, 'Target.md'), 'Done.\n');
    await runCliCommand({ name: 'index', workspacePath: workspaceRoot });

    const result = await runCliCommand({
      name: 'query',
      report: 'edges',
      workspacePath: workspaceRoot,
      arguments: { from: 'Home.md', limit: 100 },
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).not.toContain('\n');
    expect(JSON.parse(result.output)).toEqual({
      edges: [{ from: 'Home.md', to: 'Target.md', edgeTypes: ['reference'] }],
      page: { offset: 0, limit: 100, returned: 1, total: 1 },
    });

    const reports = await Promise.all([
      runCliCommand({
        name: 'query', report: 'nodes', workspacePath: workspaceRoot, arguments: { limit: 100 },
      }),
      runCliCommand({
        name: 'query', report: 'relationships', workspacePath: workspaceRoot,
        arguments: { from: 'Home.md', limit: 100 },
      }),
      runCliCommand({
        name: 'query', report: 'symbols', workspacePath: workspaceRoot,
        arguments: { filePath: 'Home.md', limit: 100 },
      }),
      runCliCommand({
        name: 'query', report: 'paths', workspacePath: workspaceRoot,
        arguments: { from: 'Home.md', to: 'Target.md' },
      }),
    ]);

    expect(reports.map(report => report.exitCode)).toEqual([0, 0, 0, 0]);
    expect(JSON.parse(reports[0]!.output)).toHaveProperty('nodes');
    expect(JSON.parse(reports[1]!.output)).toHaveProperty('relationships');
    expect(JSON.parse(reports[2]!.output)).toHaveProperty('symbols');
    expect(JSON.parse(reports[3]!.output)).toMatchObject({
      paths: [['Home.md', 'Target.md']],
    });
  });

  it('returns machine-readable errors for invalid query syntax', async () => {
    await expect(runCliCommand({
      name: 'query',
      parseError: 'paths requires --from and --to',
    })).resolves.toEqual({
      exitCode: 2,
      output: '{"error":"invalid_arguments","message":"paths requires --from and --to"}',
    });
  });

  it('identifies top-level graph reports in verbose diagnostics', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-cli-query-diagnostics-'));
    await writeFile(join(workspaceRoot, 'Home.md'), 'See [[Target.md]].\n');
    await writeFile(join(workspaceRoot, 'Target.md'), 'Done.\n');
    await runCliCommand({ name: 'index', workspacePath: workspaceRoot });
    const diagnostics: string[] = [];

    await runCliCommand({
      name: 'query',
      report: 'edges',
      verbose: true,
      workspacePath: workspaceRoot,
      arguments: { from: 'Home.md', limit: 100 },
    }, {
      writeDiagnostic: line => diagnostics.push(line),
    });

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining('Starting command: query'),
      expect.stringContaining('report=edges'),
      expect.stringContaining('Starting Graph Query: report=edges'),
      expect.stringContaining('Graph Query complete: report=edges'),
      expect.stringContaining('Command complete: query, report=edges'),
    ]));
  });

  it('forwards verbose diagnostics from workspace indexing', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-cli-diagnostics-'));
    const diagnostics: string[] = [];

    const result = await runCliCommand(
      { name: 'index', verbose: true, workspacePath: workspaceRoot },
      {
        writeDiagnostic: line => diagnostics.push(line),
      },
    );

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot,
      graphCache: '.codegraphy/graph.sqlite',
    });
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining('[CodeGraphy] Starting indexing:'),
      expect.stringContaining('[CodeGraphy] Indexing complete:'),
    ]));
  });
});
