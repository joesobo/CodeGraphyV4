import type { CliCommand } from './parseTypes';

function error(name: 'filter' | 'scope', message: string): CliCommand {
  return { name, parseError: message };
}

export function parseScopeCommand(argv: string[]): CliCommand {
  if (argv.length === 0) return { name: 'scope' };
  const [kind, type, state, extra] = argv;
  if (kind !== 'node' && kind !== 'edge') {
    return error('scope', `scope requires node or edge, received: ${kind}`);
  }
  if (!type || (state !== 'on' && state !== 'off')) {
    return error('scope', `scope ${kind} requires <type> <on|off>`);
  }
  if (extra) return error('scope', `Unexpected argument for scope: ${extra}`);
  return {
    name: 'scope',
    arguments: { kind, type, enabled: state === 'on' },
  };
}

export function parseFilterCommand(argv: string[]): CliCommand {
  if (argv.length === 0) return { name: 'filter' };
  const [action, pattern, extra] = argv;
  if (action !== 'add' && action !== 'remove') {
    return error('filter', `filter requires add or remove, received: ${action}`);
  }
  if (!pattern) return error('filter', `filter ${action} requires <glob>`);
  if (extra) return error('filter', `Unexpected argument for filter: ${extra}`);
  return { name: 'filter', arguments: { action, pattern } };
}
