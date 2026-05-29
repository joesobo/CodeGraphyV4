import { describe, expect, it } from 'vitest';
import {
  createHelpResult,
  createMissingPackageResult,
} from '../../../src/cli/plugins/help';

describe('cli/plugins/help', () => {
  it('prints the plugin command summary', () => {
    expect(createHelpResult()).toEqual({
      exitCode: 0,
      output: [
        'CodeGraphy plugin commands',
        '',
        'Commands:',
        '  codegraphy plugins register <package>',
        '  codegraphy plugins link <package-root>',
        '  codegraphy plugins list [workspace]',
        '  codegraphy plugins enable <package> [workspace]',
        '  codegraphy plugins disable <package> [workspace]',
      ].join('\n'),
    });
  });

  it('prints action-specific missing package usage', () => {
    expect(createMissingPackageResult('register')).toEqual({
      exitCode: 1,
      output: 'Usage: codegraphy plugins register <package>',
    });
    expect(createMissingPackageResult('enable')).toEqual({
      exitCode: 1,
      output: 'Usage: codegraphy plugins enable <package> [workspace]',
    });
    expect(createMissingPackageResult('disable')).toEqual({
      exitCode: 1,
      output: 'Usage: codegraphy plugins disable <package> [workspace]',
    });
  });
});
