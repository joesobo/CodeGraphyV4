import type { CliCommand } from './parseTypes';

const PLUGIN_COMMANDS = new Set(['register', 'link', 'disable', 'enable', 'inherit', 'list']);

export function isPluginCommand(value: string | undefined): boolean {
  return value !== undefined && PLUGIN_COMMANDS.has(value);
}

export function parsePluginsCommand(argv: string[]): CliCommand {
  const [action, ...rawOperands] = argv;
  const optionsEnded = rawOperands[0] === '--';
  const separatedOperands = optionsEnded ? rawOperands.slice(1) : rawOperands;
  const globalFlags = optionsEnded
    ? []
    : separatedOperands.filter(operand => operand === '--global' || operand === '-g');
  const operands = optionsEnded
    ? separatedOperands
    : separatedOperands.filter(operand => operand !== '--global' && operand !== '-g');
  const [packageName, extra] = operands;

  if (!action || action === 'help') {
    return { name: 'help', helpPath: ['plugins'] };
  }

  if (globalFlags.length > 1) {
    return { name: 'plugins', parseError: `Duplicate global option for plugins ${action}` };
  }
  if (globalFlags.length > 0 && action !== 'enable' && action !== 'disable') {
    return { name: 'plugins', parseError: `plugins ${action} does not support --global` };
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
      return {
        name: 'plugins',
        action,
        packageName,
        ...(globalFlags.length > 0 ? { pluginScope: 'global' } : {}),
      };
    }
    case 'inherit': {
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
