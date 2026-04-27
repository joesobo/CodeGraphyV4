export type CliCommandName = 'help' | 'list' | 'mcp' | 'reindex' | 'setup' | 'status';

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
    case 'status':
      return { name: 'status', repoPath: rest[0] };
    case 'reindex':
      return { name: 'reindex', repoPath: rest[0] };
    case 'mcp':
      return { name: 'mcp' };
    default:
      return { name: 'help' };
  }
}
