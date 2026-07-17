import { describe, expect, it } from 'vitest';
import { parseCliOutput, readCliError } from '../../src/cli/outputValue';

describe('cli/outputValue', () => {
  it('parses JSON and preserves plain text', () => {
    expect(parseCliOutput('{"value":1}')).toEqual({ value: 1 });
    expect(parseCliOutput('plain text')).toBe('plain text');
  });

  it('normalizes error values', () => {
    expect(readCliError(null)).toEqual({ code: 'command_failed', message: 'null' });
    expect(readCliError('failure')).toEqual({ code: 'command_failed', message: 'failure' });
    expect(readCliError({})).toEqual({ code: 'command_failed', message: 'Command failed.' });
    expect(readCliError({ error: 2, message: 3, action: 4 })).toEqual({
      code: 'command_failed',
      message: 'Command failed.',
    });
    expect(readCliError({ error: 'bad', message: 'Failure.', action: 'Retry.' })).toEqual({
      code: 'bad',
      message: 'Failure.',
      action: 'Retry.',
    });
  });
});
