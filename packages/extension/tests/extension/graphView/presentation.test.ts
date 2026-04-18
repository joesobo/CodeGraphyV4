import { describe, expect, it } from 'vitest';
import {
  applyGraphViewTransform,
} from '../../../src/extension/graphView/presentation/transform';
import { getRelativeWorkspacePath } from '../../../src/extension/graphView/presentation/workspacePath';

describe('graphView/presentation', () => {
  it('re-exports the presentation helpers', () => {
    expect(typeof applyGraphViewTransform).toBe('function');
    expect(typeof getRelativeWorkspacePath).toBe('function');
  });
});
