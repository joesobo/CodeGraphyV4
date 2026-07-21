import { describe, expect, it } from 'vitest';
import { parseQueryCommand } from '../../src/cli/parseQuery';

describe('cli/parseQuery', () => {
  it('uses fixed bounded defaults for node and edge reports', () => {
    expect(parseQueryCommand(['nodes'])).toEqual({
      name: 'query',
      report: 'nodes',
      arguments: { limit: 100 },
    });
    expect(parseQueryCommand(['edges'])).toEqual({
      name: 'query',
      report: 'edges',
      arguments: { limit: 100 },
    });
  });

  it('maps intent commands to graph reports with positional operands', () => {
    expect(parseQueryCommand(['search', 'render settings'])).toEqual({
      name: 'query',
      invokedCommand: 'search',
      report: 'nodes',
      arguments: { search: 'render settings', limit: 100 },
    });
    expect(parseQueryCommand(['dependencies', 'src/app.ts'])).toEqual({
      name: 'query',
      invokedCommand: 'dependencies',
      report: 'edges',
      arguments: { from: 'src/app.ts', expandFileSelectors: true, projectFileEndpoints: true, limit: 100 },
    });
    expect(parseQueryCommand(['dependents', 'src/config.ts'])).toEqual({
      name: 'query',
      invokedCommand: 'dependents',
      report: 'edges',
      arguments: { to: 'src/config.ts', expandFileSelectors: true, projectFileEndpoints: true, limit: 100 },
    });
    expect(parseQueryCommand(['path', 'src/app.ts', 'src/config.ts'])).toEqual({
      name: 'query',
      invokedCommand: 'path',
      report: 'paths',
      arguments: {
        from: 'src/app.ts',
        to: 'src/config.ts',
        maxDepth: 6,
        maxPaths: 5,
        expandFileSelectors: true,
        projectFileEndpoints: true,
      },
    });
  });

  it('parses local pagination options and the end-of-options delimiter', () => {
    expect(parseQueryCommand(['search', '--limit', '5', '--offset', '10', 'render'])).toMatchObject({
      invokedCommand: 'search',
      arguments: { search: 'render', limit: 5, offset: 10 },
    });
    expect(parseQueryCommand(['search', '--', '-generated'])).toMatchObject({
      invokedCommand: 'search',
      arguments: { search: '-generated', limit: 100 },
    });
  });

  it('parses one-off Filter and Graph Scope overrides for every query', () => {
    expect(parseQueryCommand([
      'dependencies', 'src/app.ts',
      '--filter', '**/*.test.ts,docs/**',
      '--node-type', 'file,symbol:function',
      '--edge-type', 'import',
      '--edge-type', 'call',
    ])).toMatchObject({
      invokedCommand: 'dependencies',
      projection: {
        filterPatterns: ['**/*.test.ts', 'docs/**'],
        nodeTypes: ['file', 'symbol:function'],
        edgeTypes: ['import', 'call'],
      },
    });

    expect(parseQueryCommand([
      'path', 'src/app.ts', 'src/model.ts', '--filter', 'generated/**',
    ])).toMatchObject({
      invokedCommand: 'path',
      projection: { filterPatterns: ['generated/**'] },
    });
  });

  it('rejects invalid flags, pagination values, operands, and retired reports', () => {
    expect(parseQueryCommand(['nodes', '--unknown'])).toMatchObject({
      parseError: 'Unknown option for nodes: --unknown',
    });
    expect(parseQueryCommand(['nodes', '--limit', '0'])).toMatchObject({
      parseError: '--limit requires a positive integer',
    });
    expect(parseQueryCommand(['nodes', '--offset', '-1'])).toMatchObject({
      parseError: '--offset requires a non-negative integer',
    });
    expect(parseQueryCommand(['nodes', '--filter', ','])).toMatchObject({
      parseError: '--filter requires a comma-separated list',
    });
    expect(parseQueryCommand(['nodes', '--filter', '--node-type', 'file'])).toMatchObject({
      parseError: '--filter requires a comma-separated list',
    });
    expect(parseQueryCommand(['nodes', '--node-type', '--edge-type', 'import'])).toMatchObject({
      parseError: '--node-type requires a comma-separated list',
    });
    expect(parseQueryCommand(['nodes', '--edge-type', '--limit', '5'])).toMatchObject({
      parseError: '--edge-type requires a comma-separated list',
    });
    expect(parseQueryCommand(['search'])).toMatchObject({
      invokedCommand: 'search',
      parseError: 'search requires <text>',
    });
    expect(parseQueryCommand(['dependencies', 'a.ts', 'b.ts'])).toMatchObject({
      parseError: 'Unexpected argument for dependencies: b.ts',
    });
    expect(parseQueryCommand(['path', 'a.ts'])).toMatchObject({
      parseError: 'path requires <from> <to>',
    });
    expect(parseQueryCommand(['relationships'])).toMatchObject({
      parseError: 'Unknown query command: relationships',
    });
    expect(parseQueryCommand(['symbols'])).toMatchObject({
      parseError: 'Unknown query command: symbols',
    });
    expect(parseQueryCommand(['paths'])).toMatchObject({
      parseError: 'Unknown query command: paths',
    });
  });
});
