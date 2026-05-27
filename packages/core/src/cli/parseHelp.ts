export function isHelpCommandName(name: string | undefined): boolean {
  return name === undefined || name === 'help' || name === '--help' || name === '-h';
}
