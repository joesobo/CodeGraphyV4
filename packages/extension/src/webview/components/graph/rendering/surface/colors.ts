import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';

export function getGraphSurfaceColors(appearance: GraphAppearance = DEFAULT_GRAPH_APPEARANCE): {
  canvasBackgroundColor: string;
  containerBackgroundColor: string;
  borderColor: string;
} {
  return {
    canvasBackgroundColor: appearance.transparent,
    containerBackgroundColor: appearance.stageBackground,
    borderColor: appearance.stageBorder,
  };
}
