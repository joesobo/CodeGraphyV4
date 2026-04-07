import type { EditorOpenBehavior } from './types';

export function createDefaultTimelinePreviewBehavior(): EditorOpenBehavior {
  return {
    preview: true,
    preserveFocus: false,
  };
}

export function createTemporaryNodeOpenBehavior(): EditorOpenBehavior {
  return {
    preview: true,
    preserveFocus: false,
  };
}

export function createPermanentNodeOpenBehavior(): EditorOpenBehavior {
  return {
    preview: false,
    preserveFocus: false,
  };
}
