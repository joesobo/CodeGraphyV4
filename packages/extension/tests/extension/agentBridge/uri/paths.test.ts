import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeAgentRepoPath } from '../../../../src/extension/agentBridge/uri/paths';

describe('agentBridge/uri/paths', () => {
  it('resolves non-Windows paths without changing case', () => {
    expect(normalizeAgentRepoPath('/workspace/MyProject', 'darwin')).toBe(
      path.resolve('/workspace/MyProject'),
    );
  });

  it('lowercases Windows paths for case-insensitive workspace matching', () => {
    expect(normalizeAgentRepoPath('C:\\Workspace\\MyProject', 'win32')).toBe(
      path.resolve('C:\\Workspace\\MyProject').toLowerCase(),
    );
  });
});
