import type { CliCommand } from './parseTypes';

const PLUGIN_COMMANDS = new Set(['register', 'link', 'disable', 'enable', 'list']);

export function isPluginCommand(value: string | undefined): boolean {
  return value !== undefined && PLUGIN_COMMANDS.has(value);
}

export function parsePluginsCommand(argv: string[]): CliCommand {
  const [action, ...rawOperands] = argv;
  const operands = rawOperands[0] === '--' ? rawOperands.slice(1) : rawOperands;
  const [packageName, extra] = operands;

  if (!action || action === 'help') {
    return { name: 'help', helpPath: ['plugins'] };
  }

  const requirePackage = (): CliCommand | undefined => packageName
    ? undefined
    : { name: 'plugins', parseError: `plugins ${action} requires <plugin-id-or-package>` };

  const rejectExtra = (argument: string | undefined): CliCommand | undefined => argument
    ? { name: 'plugins', parseError: `Unexpected argument for plugins ${action}: ${argument}` }
    : undefined;

  switch (action) {
    case 'register': {
      if (!packageName) {
        return { name: 'plugins', parseError: 'plugins register requires <package>' };
      }
      const invalid = rejectExtra(extra);
      if (invalid) return invalid;
      return { name: 'plugins', action, packageName };
    }
    case 'link': {
      if (!packageName) {
        return { name: 'plugins', parseError: 'plugins link requires <package-root>' };
      }
      const invalid = rejectExtra(extra);
      if (invalid) return invalid;
      return { name: 'plugins', action, packageRoot: packageName };
    }
    case 'disable':
    case 'enable': {
      const missing = requirePackage();
      if (missing) return missing;
      const invalid = rejectExtra(extra);
      if (invalid) return invalid;
      return { name: 'plugins', action, packageName };
    }
    case 'list': {
      const invalid = rejectExtra(packageName);
      if (invalid) return invalid;
      return { name: 'plugins', action };
    }
    default:
      return { name: 'plugins', parseError: `Unknown plugin command: ${action}` };
  }
}
