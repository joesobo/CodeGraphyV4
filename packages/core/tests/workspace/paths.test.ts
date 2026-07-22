import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getCodeGraphyDirectoryPath,
  getGraphCachePath,
  getWorkspaceSettingsPath,
  resolveWorkspaceRoot,
} from '../../src/workspace/paths';

describe('CodeGraphy workspace paths', () => {
  it('resolves workspace-local CodeGraphy state paths', () => {
    const workspaceRoot = path.join('relative', 'workspace');
    const resolvedWorkspaceRoot = resolveWorkspaceRoot(workspaceRoot);

    expect(getCodeGraphyDirectoryPath(workspaceRoot)).toBe(
      path.join(resolvedWorkspaceRoot, '.codegraphy'),
    );
    expect(getGraphCachePath(workspaceRoot)).toBe(
      path.join(resolvedWorkspaceRoot, '.codegraphy', 'graph.sqlite'),
    );
    expect(getWorkspaceSettingsPath(workspaceRoot)).toBe(
      path.join(resolvedWorkspaceRoot, '.codegraphy', 'settings.json'),
    );
  });
});
