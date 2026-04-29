import { spawnSync } from 'node:child_process';

export interface CodexMcpSetupResult {
  configured: boolean;
  changed: boolean;
  warning?: string;
}

type SpawnSyncLike = typeof spawnSync;

export function configureCodexMcp(run: SpawnSyncLike = spawnSync): CodexMcpSetupResult {
  const getResult = run('codex', ['mcp', 'get', 'codegraphy', '--json'], {
    encoding: 'utf8',
  });

  if (getResult.status === 0) {
    return { configured: true, changed: false };
  }

  if (getResult.error && 'code' in getResult.error && getResult.error.code === 'ENOENT') {
    return {
      configured: false,
      changed: false,
      warning: 'Codex CLI not found. Install Codex or run `codex mcp add codegraphy -- codegraphy mcp` later.',
    };
  }

  const addResult = run('codex', ['mcp', 'add', 'codegraphy', '--', 'codegraphy', 'mcp'], {
    encoding: 'utf8',
  });

  if (addResult.status === 0) {
    return { configured: true, changed: true };
  }

  return {
    configured: false,
    changed: false,
    warning: (addResult.stderr || addResult.stdout || '').trim()
      || 'Failed to add CodeGraphy MCP to Codex automatically.',
  };
}
