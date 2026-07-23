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
    expect(result.output).toContain(
      'codegraphy plugins                       Register Plugins and change global or workspace activity',
    );
    expect(result.output).toContain('-C, --workspace <path>');
    expect(result.output).not.toContain('relationships');
    expect(result.output).not.toContain('symbols');
    expect(result.output).not.toContain('paths');
    expect(result.output).not.toContain('setup');
    expect(result.output).not.toContain('[workspace]');
  });

  it('explains the index, settings, and query workflow from root help', () => {
    const output = createHelpResult().output;

    expect(output).toContain('1. Configure graph contributors with Plugins when needed.');
    expect(output).toContain('2. Index the complete workspace graph into its Graph Cache.');
    expect(output).toContain('3. Shape returned results with Filters and Graph Scope.');
    expect(output).toContain('4. Query the resulting graph.');
    expect(output).toContain('codegraphy index                         Create or update the Graph Cache');
    expect(output).toContain('codegraphy filter                        Read or change persisted Filters');
    expect(output).toContain('codegraphy dependencies <node>           List outgoing Relationships');
    expect(output).toContain('Exit status: 0 success, 1 operational failure, 2 invalid invocation.');
    expect(output).toContain('Data is JSON on stdout; failures are JSON on stderr.');
  });

  it('reports local pagination options for bounded list queries', () => {
    expect(createHelpResult(['status']).output).toContain('Usage: codegraphy status');
    expect(createHelpResult(['nodes']).output).toContain('Usage: codegraphy nodes');
    expect(createHelpResult(['search']).output).toContain('Usage: codegraphy search');
    expect(createHelpResult(['dependencies']).output).toContain('Usage: codegraphy dependencies');
    expect(createHelpResult(['dependencies']).output).toContain('--limit <count>');
    expect(createHelpResult(['dependencies']).output).toContain('--offset <count>');
    expect(createHelpResult(['path']).output).toContain('Usage: codegraphy path <from> <to>');
  });

  it('documents one-off query projections without implying settings changes', () => {
    for (const command of ['nodes', 'search', 'edges', 'dependencies', 'dependents', 'path']) {
      const output = createHelpResult([command]).output;
      expect(output).toContain('--filter <glob[,glob...]>');
      expect(output).toContain('--node-type <type[,type...]>');
      expect(output).toContain('--edge-type <type[,type...]>');
      expect(output).toContain('do not change .codegraphy/settings.json');
    }
  });

  it('documents the doctor failure data exception', () => {
    expect(createHelpResult(['doctor']).output).toContain(
      'Failure envelope: Includes the completed checks in error.details.',
    );
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

    const pluginHelp = createHelpResult(['plugins', 'enable']).output;
    expect(pluginHelp).toContain('Run `codegraphy index` to include its facts.');
  });

  it('documents global and inherited plugin activation', () => {
    expect(createHelpResult(['plugins', 'enable']).output).toContain(
      'Usage: codegraphy plugins enable [--global] <plugin-id-or-package>',
    );
    expect(createHelpResult(['plugins', 'enable']).output).toContain(
      'Effects: Writes .codegraphy/settings.json or ~/.codegraphy/plugins.json.',
    );
    expect(createHelpResult(['plugins', 'disable']).output).toContain(
      'Usage: codegraphy plugins disable [--global] <plugin-id-or-package>',
    );
    expect(createHelpResult(['plugins', 'inherit']).output).toContain(
      'Use the global Plugin activation value in this workspace.',
    );
    expect(createHelpResult(['plugins']).output).toContain(
      'codegraphy plugins inherit <plugin-id-or-package>',
    );
  });
});
