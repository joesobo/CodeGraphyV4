import { execFileSync } from 'node:child_process';
import type { Configuration } from '../../../config/reader';
import { execGitCommand } from '../../../gitHistory/exec';
import {
  createCodeGraphyPluginSignature,
  createCodeGraphySettingsSignature,
} from '../../../repoSettings/signatures';

export function createWorkspacePipelinePluginSignature(
  plugins: ReadonlyArray<{ plugin: { id: string; version: string } }>,
): string | null {
  return createCodeGraphyPluginSignature(
    plugins.map(({ plugin }) => ({
      plugin: {
        id: plugin.id,
        version: plugin.version,
      },
    })),
  );
}

export function createWorkspacePipelineSettingsSignature(
  config: Configuration,
): string {
  return createCodeGraphySettingsSignature(config.getAll());
}

export async function readWorkspacePipelineCurrentCommitSha(
  workspaceRoot: string,
): Promise<string | null> {
  try {
    return (await execGitCommand(['rev-parse', 'HEAD'], { workspaceRoot })).trim();
  } catch {
    return null;
  }
}

export function readWorkspacePipelineCurrentCommitShaSync(
  workspaceRoot: string,
): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}
