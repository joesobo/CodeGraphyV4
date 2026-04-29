import { ensureRegistryDirectory } from '../repoRegistry/file';
import { configureCodexMcp } from './codex';

export interface SetupCommandResult {
  exitCode: number;
  output: string;
}

export function runSetupCommand(): SetupCommandResult {
  const registryDirectory = ensureRegistryDirectory();
  const codexSetup = configureCodexMcp();
  const lines = [`Prepared CodeGraphy registry directory at ${registryDirectory}.`];

  if (codexSetup.configured && codexSetup.changed) {
    lines.push('Configured Codex to launch `codegraphy mcp`.');
  } else if (codexSetup.configured) {
    lines.push('Codex MCP entry `codegraphy` is already configured.');
  } else if (codexSetup.warning) {
    lines.push(codexSetup.warning);
  }

  return {
    exitCode: 0,
    output: lines.join('\n'),
  };
}
