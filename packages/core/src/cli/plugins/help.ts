import type { CommandExecutionResult } from '../command';

export function createHelpResult(): CommandExecutionResult {
  return {
    exitCode: 0,
    output: [
      'CodeGraphy plugin commands',
      '',
      'Commands:',
      '  codegraphy plugins register <package>',
      '  codegraphy plugins link <package-root>',
      '  codegraphy plugins list',
      '  codegraphy plugins enable [--global] <plugin-id-or-package>',
      '  codegraphy plugins disable [--global] <plugin-id-or-package>',
      '  codegraphy plugins inherit <plugin-id-or-package>',
    ].join('\n'),
  };
}

export function createMissingPackageResult(action: 'disable' | 'enable' | 'inherit' | 'register'): CommandExecutionResult {
  const targetName = action === 'register' ? '<package>' : '<plugin-id-or-package>';
  return {
    exitCode: 1,
    output: `Usage: codegraphy plugins ${action} ${targetName}`,
  };
}
