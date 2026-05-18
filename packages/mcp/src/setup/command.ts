import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { configureCodexMcp } from './codex';

export interface SetupCommandResult {
  exitCode: number;
  output: string;
}

export function runSetupCommand(): SetupCommandResult {
  const codegraphyDirectory = path.join(process.env.CODEGRAPHY_HOME || os.homedir(), '.codegraphy');
  fs.mkdirSync(codegraphyDirectory, { recursive: true });
  const codexSetup = configureCodexMcp();
  const lines = [`Prepared CodeGraphy user directory at ${codegraphyDirectory}.`];

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
