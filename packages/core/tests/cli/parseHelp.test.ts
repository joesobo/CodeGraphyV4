import { describe, expect, it } from 'vitest';
import { isHelpCommandName } from '../../src/cli/parseHelp';

describe('cli/parseHelp', () => {
  it('accepts empty and explicit help command names', () => {
    expect(isHelpCommandName(undefined)).toBe(true);
    expect(isHelpCommandName('help')).toBe(true);
    expect(isHelpCommandName('--help')).toBe(true);
    expect(isHelpCommandName('-h')).toBe(true);
  });

  it('rejects non-help command names', () => {
    expect(isHelpCommandName('')).toBe(false);
    expect(isHelpCommandName('HELP')).toBe(false);
    expect(isHelpCommandName('-help')).toBe(false);
    expect(isHelpCommandName('setup')).toBe(false);
  });
});
