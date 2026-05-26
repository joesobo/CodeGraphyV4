import { describe, expect, it } from 'vitest';
import { createCodeGraphyWorkspaceStatusDetail } from '../../src/workspace/statusDetail';

describe('workspace/statusDetail', () => {
  it('formats fresh, missing, and stale status details by reason priority', () => {
    expect(createCodeGraphyWorkspaceStatusDetail('fresh', [])).toBe(
      'CodeGraphy Workspace Graph Cache is fresh.',
    );
    expect(createCodeGraphyWorkspaceStatusDetail('missing', ['never-indexed'])).toBe(
      'CodeGraphy Workspace Graph Cache is missing. Run Indexing to build it.',
    );
    expect(createCodeGraphyWorkspaceStatusDetail('missing', ['graph-cache-missing'])).toBe(
      'CodeGraphy Workspace Graph Cache file is missing. Run Indexing to rebuild it.',
    );
    expect(createCodeGraphyWorkspaceStatusDetail('stale', ['pending-changed-files'])).toBe(
      'CodeGraphy Workspace Graph Cache is stale: files changed since the last Indexing run.',
    );
    expect(createCodeGraphyWorkspaceStatusDetail('stale', ['plugin-signature-changed'])).toBe(
      'CodeGraphy Workspace Graph Cache is stale: enabled plugins changed.',
    );
    expect(createCodeGraphyWorkspaceStatusDetail('stale', ['settings-signature-changed'])).toBe(
      'CodeGraphy Workspace Graph Cache is stale: Workspace Settings changed.',
    );
    expect(createCodeGraphyWorkspaceStatusDetail('stale', ['analysis-version-changed'])).toBe(
      'CodeGraphy Workspace Graph Cache is stale: the analysis schema changed.',
    );
    expect(createCodeGraphyWorkspaceStatusDetail('stale', [])).toBe(
      'CodeGraphy Workspace Graph Cache is stale. Run Indexing to refresh it.',
    );
  });
});
