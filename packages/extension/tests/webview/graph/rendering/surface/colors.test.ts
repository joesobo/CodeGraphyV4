import { describe, expect, it } from 'vitest';
import { getGraphSurfaceColors } from '../../../../../src/webview/components/graph/rendering/surface/colors';

describe('webview/graph/theme', () => {
  it('returns the theme-resolved graph colors by default', () => {
    expect(getGraphSurfaceColors()).toEqual({
      backgroundColor: 'Canvas',
      borderColor: 'GrayText',
    });
  });

  it('returns provided graph surface colors', () => {
    expect(getGraphSurfaceColors({
      focusBorder: 'FocusBorder',
      labelForeground: 'LabelForeground',
      labelMutedForeground: 'LabelMutedForeground',
      linkHighlight: 'LinkHighlight',
      linkMuted: 'LinkMuted',
      meshDimmed: 'MeshDimmed',
      meshSelected: 'MeshSelected',
      nodeSelectionBorder: 'NodeSelectionBorder',
      stageBackground: 'EditorSurface',
      stageBorder: 'PanelBorder',
      transparent: 'transparent',
    })).toEqual({
      backgroundColor: 'EditorSurface',
      borderColor: 'PanelBorder',
    });
  });
});
