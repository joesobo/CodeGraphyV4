import type { CommandExecutionResult } from '../command';

const ROOT_HELP = [
  'CodeGraphy CLI',
  '',
  'Commands:',
  '  codegraphy index [workspace]',
  '  codegraphy status [workspace]',
  '  codegraphy nodes [workspace] [options]',
  '  codegraphy edges [workspace] [options]',
  '  codegraphy relationships [workspace] [options]',
  '  codegraphy symbols [workspace] [options]',
  '  codegraphy paths [workspace] --from <path> --to <path> [options]',
  '  codegraphy plugins <register|link|list|enable|disable>',
  '  codegraphy setup',
  '',
  'Global options:',
  '  -h, --help     Show help',
  '  -V, --version  Show version',
  '  --verbose      Write diagnostics to stderr',
].join('\n');

const QUERY_HELP: Record<string, string[]> = {
  nodes: [
    'Usage: codegraphy nodes [workspace] [--search <text>] [--limit <count>] [--offset <count>]',
  ],
  edges: [
    'Usage: codegraphy edges [workspace] [--from <path>] [--to <path>] [--type <edge-type>] [--search <text>] [--limit <count>] [--offset <count>]',
  ],
  relationships: [
    'Usage: codegraphy relationships [workspace] [--from <path>] [--to <path>] [--type <edge-type>] [--search <text>] [--limit <count>] [--offset <count>]',
  ],
  symbols: [
    'Usage: codegraphy symbols [workspace] [--file <path>] [--from <path>] [--to <path>] [--type <edge-type>] [--search <text>] [--limit <count>] [--offset <count>]',
  ],
  paths: [
    'Usage: codegraphy paths [workspace] --from <path> --to <path> [--depth <count>] [--limit <count>]',
  ],
};

const PLUGIN_HELP: Record<string, string> = {
  register: 'Usage: codegraphy plugins register <package>',
  link: 'Usage: codegraphy plugins link <package-root>',
  list: 'Usage: codegraphy plugins list [workspace]',
  enable: 'Usage: codegraphy plugins enable <plugin-id-or-package> [workspace]',
  disable: 'Usage: codegraphy plugins disable <plugin-id-or-package> [workspace]',
};

export function createHelpResult(helpPath: string[] = []): CommandExecutionResult {
  const [command, action] = helpPath;
  let output = ROOT_HELP;

  if (command === 'setup') {
    output = 'Usage: codegraphy setup';
  } else if (command === 'index' || command === 'status') {
    output = `Usage: codegraphy ${command} [workspace]`;
  } else if (command && QUERY_HELP[command]) {
    output = QUERY_HELP[command].join('\n');
  } else if (command === 'plugins' && action && PLUGIN_HELP[action]) {
    output = PLUGIN_HELP[action];
  } else if (command === 'plugins') {
    output = [
      'CodeGraphy plugin commands',
      '',
      ...Object.values(PLUGIN_HELP).map(usage => usage.replace('Usage: ', '  ')),
    ].join('\n');
  }

  return { exitCode: 0, output };
}
