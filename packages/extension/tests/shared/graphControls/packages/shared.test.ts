import { describe, expect, it } from 'vitest';
import {
  getWorkspacePackageNodeId,
  isFileNode,
  WORKSPACE_PACKAGE_NODE_ID_PREFIX,
} from '../../../../src/shared/graphControls/packages/workspace';

describe('shared/graphControls/packages/workspace', () => {
  it('treats file nodes and missing node types as file nodes', () => {
    expect(isFileNode({
      id: 'src/app.ts',
      label: 'app.ts',
      color: '#111111',
      nodeType: 'file',
    })).toBe(true);

    expect(isFileNode({
      id: 'src/app.ts',
      label: 'app.ts',
      color: '#111111',
    })).toBe(true);
  });

  it('rejects non-file nodes', () => {
    expect(isFileNode({
      id: 'pkg:workspace:packages/extension',
      label: 'extension',
      color: '#F59E0B',
      nodeType: 'package',
    })).toBe(false);
  });

  it('builds stable workspace package ids', () => {
    expect(getWorkspacePackageNodeId('packages/extension')).toBe(
      `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
    );
  });
});
