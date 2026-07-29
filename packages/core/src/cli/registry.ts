import { runDoctorCommand } from './doctor/command';
import { runFilterCommand } from './filter/command';
import { COMMAND_HELP, PLUGIN_HELP, PLUGINS_HELP, ROOT_HELP } from './help/model';
import { runIndexCommand } from './index/command';
import { parseFilterCommand, parseScopeCommand } from './parseGraphControls';
import { parsePluginsCommand } from './parsePlugins';
import { GRAPH_QUERY_COMMAND_NAMES, parseQueryCommand } from './parseQuery';
import { parseSettingsCommand } from './parseSettings';
import type { CliCommand, SettingsCliCommand } from './parseTypes';
import { parseWorkspaceCommand } from './parseWorkspace';
import { runPluginsCommand } from './plugins/command';
import { runQueryCommand } from './query/command';
import { runScopeCommand } from './scope/command';
import { runSettingsCommand } from './settings/command';
import { runStatusCommand } from './status/command';
import { runWatchCommand, type WatchCommandEvent } from './watch/command';
import type { CommandExecutionResult } from './command';

export interface RegisteredCommandDependencies {
  runWatch?: typeof runWatchCommand;
  writeDiagnostic?(line: string): void;
  writeWatchEvent?(event: WatchCommandEvent): void;
}

type RegisteredParser = (name: string, args: string[]) => CliCommand;
type RegisteredRunner = (
  command: CliCommand,
  dependencies: RegisteredCommandDependencies,
) => CommandExecutionResult | Promise<CommandExecutionResult>;

interface CliCommandRegistration {
  commandName: CliCommand['name'];
  help: string;
  name: string;
  parse: RegisteredParser;
  run: RegisteredRunner;
}

function commandHelp(name: string): string {
  return COMMAND_HELP[name] ?? ROOT_HELP;
}

function diagnosticOptions(command: CliCommand, dependencies: RegisteredCommandDependencies) {
  return {
    verbose: command.verbose,
    ...(dependencies.writeDiagnostic
      ? { writeDiagnostic: (line: string) => dependencies.writeDiagnostic?.(line) }
      : {}),
  };
}

const runIndex: RegisteredRunner = (command, dependencies) => runIndexCommand(
  command.workspacePath,
  undefined,
  diagnosticOptions(command, dependencies),
);
const runQuery: RegisteredRunner = (command, dependencies) => runQueryCommand(
  command,
  undefined,
  diagnosticOptions(command, dependencies),
);
const runStatus: RegisteredRunner = (command, dependencies) => runStatusCommand(
  command.workspacePath,
  undefined,
  diagnosticOptions(command, dependencies),
);
const runWatch: RegisteredRunner = (command, dependencies) => (
  dependencies.runWatch ?? runWatchCommand
)(
  command.workspacePath,
  undefined,
  { writeEvent: event => dependencies.writeWatchEvent?.(event) },
);

const COMMAND_REGISTRATIONS: readonly CliCommandRegistration[] = [
  {
    name: 'doctor',
    commandName: 'doctor',
    help: commandHelp('doctor'),
    parse: (_name, args) => parseWorkspaceCommand('doctor', args),
    run: command => runDoctorCommand(command),
  },
  {
    name: 'index',
    commandName: 'index',
    help: commandHelp('index'),
    parse: (_name, args) => parseWorkspaceCommand('index', args),
    run: runIndex,
  },
  {
    name: 'status',
    commandName: 'status',
    help: commandHelp('status'),
    parse: (_name, args) => parseWorkspaceCommand('status', args),
    run: runStatus,
  },
  {
    name: 'watch',
    commandName: 'watch',
    help: commandHelp('watch'),
    parse: (_name, args) => parseWorkspaceCommand('watch', args),
    run: runWatch,
  },
  {
    name: 'filter',
    commandName: 'filter',
    help: commandHelp('filter'),
    parse: (_name, args) => parseFilterCommand(args),
    run: command => runFilterCommand(command),
  },
  {
    name: 'scope',
    commandName: 'scope',
    help: commandHelp('scope'),
    parse: (_name, args) => parseScopeCommand(args),
    run: command => runScopeCommand(command),
  },
  {
    name: 'settings',
    commandName: 'settings',
    help: commandHelp('settings'),
    parse: (_name, args) => parseSettingsCommand(args),
    run: command => runSettingsCommand(command as SettingsCliCommand),
  },
  {
    name: 'plugins',
    commandName: 'plugins',
    help: PLUGINS_HELP,
    parse: (_name, args) => parsePluginsCommand(args),
    run: command => runPluginsCommand(command),
  },
  ...GRAPH_QUERY_COMMAND_NAMES.map(name => ({
    name,
    commandName: 'query' as const,
    help: commandHelp(name),
    parse: (command: string, args: string[]) => parseQueryCommand([command, ...args]),
    run: runQuery,
  })),
];

const HELP_REGISTRATION: CliCommandRegistration = {
  name: 'help',
  commandName: 'help',
  help: ROOT_HELP,
  parse: () => ({ name: 'help' }),
  run: command => createRegisteredHelpResult(command.helpPath),
};

const VERSION_REGISTRATION: CliCommandRegistration = {
  name: 'version',
  commandName: 'version',
  help: ROOT_HELP,
  parse: () => ({ name: 'version' }),
  run: async () => ({
    exitCode: 0,
    output: (await import('./version')).readCliVersion(),
  }),
};

const PUBLIC_REGISTRATION_BY_NAME = new Map(
  COMMAND_REGISTRATIONS.map(registration => [registration.name, registration]),
);
const EXECUTION_BY_COMMAND_NAME = new Map(
  [...COMMAND_REGISTRATIONS, HELP_REGISTRATION, VERSION_REGISTRATION]
    .map(registration => [registration.commandName, registration]),
);

export function isRegisteredCommandName(name: string | undefined): boolean {
  return name !== undefined && PUBLIC_REGISTRATION_BY_NAME.has(name);
}

export function parseRegisteredCommand(name: string, args: string[]): CliCommand | undefined {
  return PUBLIC_REGISTRATION_BY_NAME.get(name)?.parse(name, args);
}

export function createRegisteredHelpResult(helpPath: string[] = []): CommandExecutionResult {
  const [command, action] = helpPath;
  if (!command) return { exitCode: 0, output: ROOT_HELP };
  if (command === 'plugins' && action) {
    return { exitCode: 0, output: PLUGIN_HELP[action] ?? PLUGINS_HELP };
  }
  return {
    exitCode: 0,
    output: PUBLIC_REGISTRATION_BY_NAME.get(command)?.help ?? ROOT_HELP,
  };
}

export function runRegisteredCommand(
  command: CliCommand,
  dependencies: RegisteredCommandDependencies = {},
): Promise<CommandExecutionResult> {
  const registration = EXECUTION_BY_COMMAND_NAME.get(command.name);
  if (!registration) throw new Error(`No CLI command registration for: ${command.name}`);
  return Promise.resolve(registration.run(command, dependencies));
}
