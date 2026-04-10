import type { EditorOpenBehavior } from './contracts';

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
