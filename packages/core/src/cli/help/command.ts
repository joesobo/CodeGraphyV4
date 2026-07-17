import type { CommandExecutionResult } from '../command';

const ROOT_HELP = [
  'CodeGraphy CLI',
  '',
  'Commands:',
  '  codegraphy index',
  '  codegraphy status',
  '  codegraphy doctor',
  '  codegraphy nodes',
  '  codegraphy search <text>',
  '  codegraphy edges',
  '  codegraphy dependencies <node>',
  '  codegraphy dependents <node>',
  '  codegraphy path <from> <to>',
  '  codegraphy scope',
  '  codegraphy scope node <type> <on|off>',
  '  codegraphy scope edge <type> <on|off>',
  '  codegraphy filter',
  '  codegraphy filter <add|remove> <glob>',
  '  codegraphy plugins <register|link|list|enable|disable>',
  '',
  'Global options:',
  '  -C, --workspace <path>  Use another workspace (default: current directory)',
  '  -h, --help              Show help',
  '  -V, --version           Show version',
  '  --verbose               Write diagnostics to stderr',
].join('\n');

const COMMAND_HELP: Record<string, string> = {
  index: 'Usage: codegraphy index',
  status: 'Usage: codegraphy status',
  doctor: 'Usage: codegraphy doctor',
  nodes: 'Usage: codegraphy nodes',
  search: 'Usage: codegraphy search <text>',
  edges: 'Usage: codegraphy edges',
  dependencies: 'Usage: codegraphy dependencies <node>',
  dependents: 'Usage: codegraphy dependents <node>',
  path: 'Usage: codegraphy path <from> <to>',
  scope: 'Usage: codegraphy scope [node|edge <type> <on|off>]',
  filter: 'Usage: codegraphy filter [add|remove <glob>]',
};

const PLUGIN_HELP: Record<string, string> = {
  register: 'Usage: codegraphy plugins register <package>',
  link: 'Usage: codegraphy plugins link <package-root>',
  list: 'Usage: codegraphy plugins list',
  enable: 'Usage: codegraphy plugins enable <plugin-id-or-package>',
  disable: 'Usage: codegraphy plugins disable <plugin-id-or-package>',
};

export function createHelpResult(helpPath: string[] = []): CommandExecutionResult {
  const [command, action] = helpPath;
  let output = ROOT_HELP;
  if (command && COMMAND_HELP[command]) output = COMMAND_HELP[command];
  if (command === 'plugins' && action && PLUGIN_HELP[action]) output = PLUGIN_HELP[action];
  if (command === 'plugins' && !action) {
    output = ['CodeGraphy plugin commands', '', ...Object.values(PLUGIN_HELP).map(line => line.replace('Usage: ', '  '))].join('\n');
  }
  return { exitCode: 0, output };
}
