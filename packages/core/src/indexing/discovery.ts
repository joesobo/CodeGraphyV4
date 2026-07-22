import { DEFAULT_INCLUDE, DEFAULT_MAX_FILES } from '../discovery/file/defaults';
import type { IDiscoveryResult } from '../discovery/contracts';
import { FileDiscovery } from '../discovery/file/service';
import type { CodeGraphyWorkspaceSettings } from '../workspace/settings';
import type { IndexCodeGraphyWorkspaceOptions } from './contracts';

export async function discoverWorkspaceIndexFiles(input: {
  discovery: FileDiscovery;
  options: IndexCodeGraphyWorkspaceOptions;
  settings: CodeGraphyWorkspaceSettings;
  workspaceRoot: string;
}): Promise<IDiscoveryResult> {
  const discoveryResult = await input.discovery.discover({
    rootPath: input.workspaceRoot,
    include: input.settings.include.length > 0 ? input.settings.include : DEFAULT_INCLUDE,
    exclude: [],
    maxFiles: input.settings.maxFiles ?? DEFAULT_MAX_FILES,
    respectGitignore: input.settings.respectGitignore,
    signal: input.options.signal,
  });

  if (discoveryResult.limitReached) {
    input.options.warn?.(
      `CodeGraphy: Found ${discoveryResult.totalFound}+ files, showing first ${input.settings.maxFiles}. ` +
      'Increase maxFiles in .codegraphy/settings.json to see more.',
    );
  }

  input.options.logInfo?.(
    `[CodeGraphy] Discovered ${discoveryResult.files.length} files in ${discoveryResult.durationMs}ms`,
  );

  return discoveryResult;
}
