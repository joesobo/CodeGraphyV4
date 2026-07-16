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
      report: 'nodes',
      arguments: { search: 'render settings', limit: 100 },
    });
    expect(parseQueryCommand(['dependencies', 'src/app.ts'])).toEqual({
      name: 'query',
      report: 'edges',
      arguments: { from: 'src/app.ts', expandFileSelectors: true, projectFileEndpoints: true, limit: 100 },
    });
    expect(parseQueryCommand(['dependents', 'src/config.ts'])).toEqual({
      name: 'query',
      report: 'edges',
      arguments: { to: 'src/config.ts', expandFileSelectors: true, projectFileEndpoints: true, limit: 100 },
    });
    expect(parseQueryCommand(['path', 'src/app.ts', 'src/config.ts'])).toEqual({
      name: 'query',
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

  it('rejects flags, missing operands, extra operands, and retired reports', () => {
    expect(parseQueryCommand(['nodes', '--limit', '5'])).toMatchObject({
      parseError: 'Unknown option for nodes: --limit',
    });
    expect(parseQueryCommand(['search'])).toMatchObject({
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
