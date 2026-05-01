export type CliCommandName = 'help' | 'index' | 'list' | 'mcp' | 'open' | 'setup';

export interface CliCommand {
  name: CliCommandName;
  repoPath?: string;
}

export function parseCliCommand(argv: string[]): CliCommand {
  const [name, ...rest] = argv;

  switch (name) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      return { name: 'help' };
    case 'setup':
      return { name: 'setup' };
    case 'list':
      return { name: 'list' };
    case 'open':
      return { name: 'open', repoPath: rest[0] };
    case 'index':
      return { name: 'index' };
    case 'mcp':
      return { name: 'mcp' };
    default:
      return { name: 'help' };
  }
}
