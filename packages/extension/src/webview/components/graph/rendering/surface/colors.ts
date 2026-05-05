import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';

export function getGraphSurfaceColors(appearance: GraphAppearance = DEFAULT_GRAPH_APPEARANCE): {
  backgroundColor: string;
  borderColor: string;
} {
  return {
    backgroundColor: appearance.stageBackground,
    borderColor: appearance.stageBorder,
  };
}
