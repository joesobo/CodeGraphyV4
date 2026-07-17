import { describe, expect, it } from 'vitest';
import { createHelpResult } from '../../../src/cli/help/command';

describe('cli/help/command', () => {
  it('lists the minimal public command surface and global workspace selector', () => {
    const result = createHelpResult();

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('codegraphy doctor');
    expect(result.output).toContain('codegraphy search <text>');
    expect(result.output).toContain('codegraphy dependencies <node>');
    expect(result.output).toContain('codegraphy path <from> <to>');
    expect(result.output).toContain('codegraphy scope node <type> <on|off>');
    expect(result.output).toContain('-C, --workspace <path>');
    expect(result.output).not.toContain('relationships');
    expect(result.output).not.toContain('symbols');
    expect(result.output).not.toContain('paths');
    expect(result.output).not.toContain('setup');
    expect(result.output).not.toContain('[workspace]');
  });

  it('explains the index, settings, and query workflow from root help', () => {
    const output = createHelpResult().output;

    expect(output).toContain('1. Index the workspace into its Graph Cache.');
    expect(output).toContain('2. Shape the graph with Filters, Graph Scope, and Plugins.');
    expect(output).toContain('3. Query the resulting graph.');
    expect(output).toContain('codegraphy index                         Create or update the Graph Cache');
    expect(output).toContain('codegraphy filter                        Read or change persisted Filters');
    expect(output).toContain('codegraphy dependencies <node>           List outgoing Relationships');
  });

  it('reports flag-free query usage', () => {
    expect(createHelpResult(['status']).output).toContain('Usage: codegraphy status');
    expect(createHelpResult(['nodes']).output).toContain('Usage: codegraphy nodes');
    expect(createHelpResult(['search']).output).toContain('Usage: codegraphy search <text>');
    expect(createHelpResult(['dependencies']).output).toContain('Usage: codegraphy dependencies <node>');
    expect(createHelpResult(['path']).output).toContain('Usage: codegraphy path <from> <to>');
  });

  it('explains command purpose, effects, output, and examples', () => {
    const indexHelp = createHelpResult(['index']).output;
    expect(indexHelp).toContain('Create or update the workspace Graph Cache.');
    expect(indexHelp).toContain('Effects: Writes .codegraphy/graph.sqlite');
    expect(indexHelp).toContain('Output: JSON indexing summary.');
    expect(indexHelp).toContain('Example: codegraphy index');

    const filterHelp = createHelpResult(['filter']).output;
    expect(filterHelp).toContain('Filters are persisted in .codegraphy/settings.json');
    expect(filterHelp).toContain("codegraphy filter add '**/generated/**'");
  });

  it('reports workspace-free plugin usage', () => {
    expect(createHelpResult(['plugins', 'enable']).output).toContain(
      'Usage: codegraphy plugins enable <plugin-id-or-package>',
    );
  });
});
