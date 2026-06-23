import type { ReactElement } from 'react';
import { SlotHost } from '../../../../pluginHost/slotHost/view';
import type { ViewportProps } from '../contracts';

export function ViewportPluginOverlay({
  pluginHost,
}: Pick<ViewportProps, 'pluginHost'>): ReactElement | null {
  return pluginHost ? (
    <>
      <SlotHost
        pluginHost={pluginHost}
        slot="graph-overlay"
        data-codegraphy-layer="graph-overlay"
        data-testid="graph-overlay-slot"
        className="absolute inset-0 z-10 pointer-events-none"
      />
      <SlotHost
        pluginHost={pluginHost}
        slot="graph.stage.viewportOverlay"
        data-codegraphy-layer="graph-stage-viewport-overlay"
        data-testid="graph-viewport-overlay-slot"
        className="absolute inset-0 z-30 pointer-events-none"
      />
    </>
  ) : null;
}

export function ViewportPluginBackground({
  pluginHost,
}: Pick<ViewportProps, 'pluginHost'>): ReactElement | null {
  return pluginHost ? (
    <SlotHost
      pluginHost={pluginHost}
      slot="graph.stage.worldBackground"
      data-codegraphy-layer="graph-stage-world-background"
      data-testid="graph-world-background-slot"
      className="absolute inset-0 z-0 pointer-events-none"
    />
  ) : null;
}

export function ViewportPluginWorldOverlay({
  pluginHost,
}: Pick<ViewportProps, 'pluginHost'>): ReactElement | null {
  return pluginHost ? (
    <SlotHost
      pluginHost={pluginHost}
      slot="graph.stage.worldOverlay"
      data-codegraphy-layer="graph-stage-world-overlay"
      data-testid="graph-world-overlay-slot"
      className="absolute inset-0 z-10 pointer-events-none"
    />
  ) : null;
}
