import { describe, expect, it } from 'vitest';
import { parseQueryCommand } from '../../src/cli/parseQuery';

describe('cli/parseQuery', () => {
  it('parses bounded list reports', () => {
    expect(parseQueryCommand([
      'relationships',
      '/workspace/project',
      '--from',
      'src/app.ts',
      '--type',
      'import',
      '--limit',
      '25',
    ])).toEqual({
      name: 'query',
      report: 'relationships',
      workspacePath: '/workspace/project',
      arguments: { from: 'src/app.ts', edgeType: 'import', limit: 25 },
    });
    expect(parseQueryCommand(['nodes'])).toEqual({
      name: 'query',
      report: 'nodes',
      arguments: { limit: 100 },
    });
  });

  it('uses concise symbol relationship flags', () => {
    expect(parseQueryCommand([
      'symbols',
      '--from',
      'src/app.ts',
      '--to',
      'src/config.ts',
      '--type',
      'call',
    ])).toEqual({
      name: 'query',
      report: 'symbols',
      arguments: {
        relatedFrom: 'src/app.ts',
        relatedTo: 'src/config.ts',
        edgeType: 'call',
        limit: 100,
      },
    });
  });

  it('parses bounded paths with concise limit names', () => {
    expect(parseQueryCommand([
      'paths',
      '--from',
      'src/app.ts',
      '--to',
      'src/config.ts',
      '--depth',
      '4',
      '--limit',
      '3',
    ])).toEqual({
      name: 'query',
      report: 'paths',
      arguments: { from: 'src/app.ts', to: 'src/config.ts', maxDepth: 4, maxPaths: 3 },
    });
  });

  it('rejects unknown, duplicate, missing, and unbounded inputs', () => {
    expect(parseQueryCommand(['nodes', '--wat'])).toEqual({
      name: 'query',
      parseError: 'Unknown option for nodes: --wat',
    });
    expect(parseQueryCommand(['nodes', '--limit', '1', '--limit', '2'])).toEqual({
      name: 'query',
      parseError: 'Duplicate option for nodes: --limit',
    });
    expect(parseQueryCommand(['nodes', '--limit'])).toEqual({
      name: 'query',
      parseError: 'Missing value for --limit',
    });
    expect(parseQueryCommand(['paths', '--from', 'src/app.ts'])).toEqual({
      name: 'query',
      parseError: 'paths requires --from and --to',
    });
    expect(parseQueryCommand(['nodes', 'one', 'two'])).toEqual({
      name: 'query',
      parseError: 'Unexpected positional argument: two',
    });
  });

  it('enforces report-specific numeric boundaries', () => {
    expect(parseQueryCommand(['nodes', '--limit', '1', '--offset', '0'])).toMatchObject({
      arguments: { limit: 1, offset: 0 },
    });
    expect(parseQueryCommand(['nodes', '--limit', '500'])).toMatchObject({
      arguments: { limit: 500 },
    });
    expect(parseQueryCommand(['nodes', '--limit', '501'])).toMatchObject({
      parseError: 'Invalid value for --limit: expected an integer from 1 to 500',
    });
    expect(parseQueryCommand(['nodes', '--offset', '-1'])).toMatchObject({
      parseError: 'Invalid value for --offset: expected an integer from 0 to 9007199254740991',
    });
    expect(parseQueryCommand([
      'paths', '--from', 'a.ts', '--to', 'b.ts', '--depth', '25', '--limit', '20',
    ])).toMatchObject({
      arguments: { from: 'a.ts', to: 'b.ts', maxDepth: 25, maxPaths: 20 },
    });
    expect(parseQueryCommand([
      'paths', '--from', 'a.ts', '--to', 'b.ts', '--depth', '26',
    ])).toMatchObject({
      parseError: 'Invalid value for --depth: expected an integer from 1 to 25',
    });
    expect(parseQueryCommand([
      'paths', '--from', 'a.ts', '--to', 'b.ts', '--limit', '21',
    ])).toMatchObject({
      parseError: 'Invalid value for --limit: expected an integer from 1 to 20',
    });
  });

  it('rejects replaced verbose flag names', () => {
    expect(parseQueryCommand(['edges', '--edge-type', 'import'])).toMatchObject({
      parseError: 'Unknown option for edges: --edge-type',
    });
    expect(parseQueryCommand(['symbols', '--related-from', 'src/app.ts'])).toMatchObject({
      parseError: 'Unknown option for symbols: --related-from',
    });
    expect(parseQueryCommand(['paths', '--max-depth', '4'])).toMatchObject({
      parseError: 'Unknown option for paths: --max-depth',
    });
  });
});
