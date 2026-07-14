import type { ThemeKind } from '../../../../theme/useTheme';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import type { GraphAppearance } from '../../appearance/model';
import type { UseGraphRenderingRuntimeOptions } from '../../runtime/use/rendering';
import type { GraphRuntime } from '../../runtime/use/state';
import type { GraphViewStoreState } from '../../view/store';

export interface BuildRenderingRuntimeOptionsInput {
  appearance?: GraphAppearance;
  graphState: GraphRuntime;
  pluginHost?: WebviewPluginHost;
  theme: ThemeKind;
  viewState: GraphViewStoreState;
}

export function buildRenderingRuntimeOptions({
  appearance,
  graphState,
  pluginHost,
  theme,
  viewState,
}: BuildRenderingRuntimeOptionsInput): UseGraphRenderingRuntimeOptions {
  return {
    appearance,
    containerRef: graphState.renderer.containerRef,
    dataRef: graphState.dataRef,
    favorites: viewState.favorites,
    graphDataRef: graphState.renderer.graphDataRef,
    pluginHost,
    theme,
  };
}
