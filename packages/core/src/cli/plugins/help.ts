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
      '  codegraphy plugins list [workspace]',
      '  codegraphy plugins enable <package> [workspace]',
      '  codegraphy plugins disable <package> [workspace]',
    ].join('\n'),
  };
}

export function createMissingPackageResult(action: 'disable' | 'enable' | 'register'): CommandExecutionResult {
  const workspaceSuffix = action === 'register' ? '' : ' [workspace]';
  return {
    exitCode: 1,
    output: `Usage: codegraphy plugins ${action} <package>${workspaceSuffix}`,
  };
}
