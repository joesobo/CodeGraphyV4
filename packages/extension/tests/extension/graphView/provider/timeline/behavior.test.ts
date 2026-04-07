import { describe, expect, it } from 'vitest';
import {
  createPermanentNodeOpenBehavior,
  createTemporaryNodeOpenBehavior,
} from '../../../../../src/extension/graphView/provider/timeline/behavior';

describe('graphView/provider/timeline behavior', () => {
  it('creates temporary and permanent node-open behaviors', () => {
    expect(createTemporaryNodeOpenBehavior()).toEqual({
      preview: true,
      preserveFocus: false,
    });
    expect(createPermanentNodeOpenBehavior()).toEqual({
      preview: false,
      preserveFocus: false,
    });
  });
});
