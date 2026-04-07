import { describe, expect, it } from 'vitest';
import {
  applyGraphViewTransform,
  getRelativeWorkspacePath,
  mapAvailableViews,
} from '../../../src/extension/graphView/presentation';

describe('graphView/presentation', () => {
  it('re-exports the presentation helpers', () => {
    expect(typeof applyGraphViewTransform).toBe('function');
    expect(typeof getRelativeWorkspacePath).toBe('function');
    expect(typeof mapAvailableViews).toBe('function');
  });
});
