import { describe, expect, it } from 'vitest';
import {
  createDefaultTimelinePreviewBehavior,
  createPermanentNodeOpenBehavior,
  createTemporaryNodeOpenBehavior,
} from '../../../../../src/extension/graphView/provider/timeline/behavior';

describe('graphView/provider/timeline behavior', () => {
  it('creates the default timeline preview behavior', () => {
    expect(createDefaultTimelinePreviewBehavior()).toEqual({
      preview: true,
      preserveFocus: false,
    });
  });

  it('creates the temporary node-open behavior', () => {
    expect(createTemporaryNodeOpenBehavior()).toEqual({
      preview: true,
      preserveFocus: false,
    });
  });

  it('creates the permanent node-open behavior', () => {
    expect(createPermanentNodeOpenBehavior()).toEqual({
      preview: false,
      preserveFocus: false,
    });
  });
});
