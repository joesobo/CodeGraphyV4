import { describe, expect, it } from 'vitest';
import { getGraphSurfaceColors } from '../../../../../src/webview/components/graph/rendering/surface/colors';

describe('webview/graph/theme', () => {
  it('returns the default graph stage colors by default', () => {
    expect(getGraphSurfaceColors()).toEqual({
      canvasBackgroundColor: 'transparent',
      containerBackgroundColor: 'Canvas',
      borderColor: 'GrayText',
    });
  });

  it('keeps the canvas transparent while the container owns the stage background', () => {
    expect(getGraphSurfaceColors({
      focusBorder: 'FocusBorder',
      labelForeground: 'LabelForeground',
      labelMutedForeground: 'LabelMutedForeground',
      linkHighlight: 'LinkHighlight',
      linkMuted: 'LinkMuted',
      nodeSelectionBorder: 'NodeSelectionBorder',
      stageBackground: 'EditorSurface',
      stageBorder: 'PanelBorder',
      transparent: 'transparent',
    })).toEqual({
      canvasBackgroundColor: 'transparent',
      containerBackgroundColor: 'EditorSurface',
      borderColor: 'PanelBorder',
    });
  });
});
