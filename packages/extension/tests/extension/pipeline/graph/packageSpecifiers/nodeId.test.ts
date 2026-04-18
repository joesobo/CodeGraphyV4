import { describe, expect, it } from 'vitest';
import {
  getExternalPackageLabelFromNodeId,
  getExternalPackageNodeId,
  isExternalPackageNodeId,
} from '../../../../../src/extension/pipeline/graph/packageSpecifiers/nodeId';

describe('pipeline/graph/packageSpecifiers/nodeId', () => {
  it('creates synthetic package node ids', () => {
    expect(getExternalPackageNodeId('react')).toBe('pkg:react');
    expect(getExternalPackageNodeId('@scope/pkg/subpath')).toBe('pkg:@scope/pkg');
    expect(getExternalPackageNodeId('./local')).toBeNull();
  });

  it('recognizes and labels external package node ids', () => {
    expect(isExternalPackageNodeId('pkg:react')).toBe(true);
    expect(isExternalPackageNodeId('src/app.ts')).toBe(false);
    expect(getExternalPackageLabelFromNodeId('pkg:@scope/pkg')).toBe('@scope/pkg');
  });
});
