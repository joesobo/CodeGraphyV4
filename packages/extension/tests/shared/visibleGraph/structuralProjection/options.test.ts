import { describe, expect, it } from 'vitest';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../src/shared/visibleGraph';
import {
  hasStructuralNodeProjection,
  resolveStructuralProjectionOptions,
} from '../../../../src/shared/visibleGraph/structuralProjection/options';

describe('shared/visibleGraph/structuralProjection/options', () => {
  it('disables structural node projection when no structural node types are enabled', () => {
    const options = resolveStructuralProjectionOptions();

    expect(options).toEqual({
      folderEnabled: false,
      packageEnabled: false,
      nestsEnabled: true,
    });
    expect(hasStructuralNodeProjection(options)).toBe(false);
  });

  it('enables folder and package projection from node scope', () => {
    const options = resolveStructuralProjectionOptions({
      nodes: [
        { type: 'folder', enabled: true },
        { type: 'package', enabled: true },
      ],
      edges: [],
    });

    expect(options.folderEnabled).toBe(true);
    expect(options.packageEnabled).toBe(true);
    expect(hasStructuralNodeProjection(options)).toBe(true);
  });

  it('enables structural projection when only folders are enabled', () => {
    const options = resolveStructuralProjectionOptions({
      nodes: [{ type: 'folder', enabled: true }],
      edges: [],
    });

    expect(options).toMatchObject({
      folderEnabled: true,
      packageEnabled: false,
    });
    expect(hasStructuralNodeProjection(options)).toBe(true);
  });

  it('enables structural projection when only packages are enabled', () => {
    const options = resolveStructuralProjectionOptions({
      nodes: [{ type: 'package', enabled: true }],
      edges: [],
    });

    expect(options).toMatchObject({
      folderEnabled: false,
      packageEnabled: true,
    });
    expect(hasStructuralNodeProjection(options)).toBe(true);
  });

  it('keeps nests enabled when no nests edge scope is provided', () => {
    const options = resolveStructuralProjectionOptions({
      nodes: [{ type: 'folder', enabled: true }],
      edges: [{ type: 'import', enabled: true }],
    });

    expect(options.nestsEnabled).toBe(true);
  });

  it('respects explicit nests edge visibility', () => {
    expect(resolveStructuralProjectionOptions({
      nodes: [{ type: 'folder', enabled: true }],
      edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: false }],
    }).nestsEnabled).toBe(false);
    expect(resolveStructuralProjectionOptions({
      nodes: [{ type: 'folder', enabled: true }],
      edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
    }).nestsEnabled).toBe(true);
  });
});
