import React, { useState } from 'react';
import { mdiChevronDown, mdiChevronUp, mdiClose } from '@mdi/js';
import { useGraphStore } from '../../../store/state';
import { postMessage } from '../../../vscodeApi';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import { SlotHost } from '../../../pluginHost/slotHost/view';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/disclosure/collapsible';
import {
  replaceCustomEdgeRules,
  upsertEdgeTypeColorRule,
  useLegendPanelState,
} from './state';
import { replaceSectionRules } from './section/displayRules';
import { LegendSection } from './section/view';
import { sendUserLegendRules } from './messages';
import {
  readLegendPanelCollapsedState,
  writeLegendPanelCollapsedState,
} from './storage';
import { CssSnippetsSection } from './cssSnippets';
import { useCollapsibleEntryState } from './section/collapseState';

interface LegendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pluginHost?: WebviewPluginHost;
}

function useCollapsedLegendEntries(): readonly [
  Record<string, boolean>,
  (entryId: string, collapsed: boolean) => void,
] {
  const [collapsedEntries, setCollapsedEntries] = useState<Record<string, boolean>>(
    readLegendPanelCollapsedState,
  );

  const setCollapsedEntry = (entryId: string, collapsed: boolean): void => {
    setCollapsedEntries((current) => {
      const next = { ...current };
      if (collapsed) {
        next[entryId] = true;
      } else {
        delete next[entryId];
      }
      writeLegendPanelCollapsedState(next);
      return next;
    });
  };

  return [collapsedEntries, setCollapsedEntry];
}

function useDisplayNodeEntries(
  nodeEntries: ReturnType<typeof useLegendPanelState>['nodeEntries'],
): {
  displayNodeEntries: LegendSectionProps['builtInEntries'];
} {
  return {
    displayNodeEntries: nodeEntries.filter((entry) => entry.id !== 'folder'),
  };
}

type LegendSectionProps = React.ComponentProps<typeof LegendSection>;

function ThemePanelSection({
  children,
  collapsedEntries,
  onCollapsedChange,
  sectionId,
  title,
}: {
  children: React.ReactNode;
  collapsedEntries: Record<string, boolean>;
  onCollapsedChange: (entryId: string, collapsed: boolean) => void;
  sectionId: string;
  title: string;
}): React.ReactElement {
  const { collapsed, onOpenChange } = useCollapsibleEntryState({
    collapsedEntries,
    onCollapsedChange,
    storageKey: `section:${sectionId}`,
  });
  const open = !collapsed;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <section className="space-y-2" data-codegraphy-section={sectionId}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-[var(--cg-accent-faint)]"
            title={`Toggle ${title} section`}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--cg-text-muted)]">
              {title}
            </h3>
            <MdiIcon path={open ? mdiChevronUp : mdiChevronDown} size={16} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export default function LegendsPanel({
  isOpen,
  onClose,
  pluginHost,
}: LegendsPanelProps): React.ReactElement | null {
  const nodeTypes = useGraphStore((state) => state.graphNodeTypes);
  const edgeTypes = useGraphStore((state) => state.graphEdgeTypes);
  const nodeColors = useGraphStore((state) => state.nodeColors);
  const legends = useGraphStore((state) => state.legends);
  const cssSnippets = useGraphStore((state) => state.cssSnippets);
  const optimisticLegendUpdates = useGraphStore((state) => state.optimisticLegendUpdates);
  const setOptimisticLegendUpdate = useGraphStore((state) => state.setOptimisticLegendUpdate);
  const setOptimisticLegendUpdates = useGraphStore((state) => state.setOptimisticLegendUpdates);
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);
  const [collapsedEntries, setCollapsedEntry] = useCollapsedLegendEntries();

  const {
    displayedEdgeLegendRules,
    displayedNodeLegendRules,
    edgeEntries,
    edgeLegendRules,
    edgeTypeIds,
    nodeEntries,
    nodeLegendRules,
    userLegendRules,
  } = useLegendPanelState({
    edgeTypes,
    legends,
    nodeColors,
    nodeTypes,
    optimisticLegendUpdates,
  });
  const {
    displayNodeEntries,
  } = useDisplayNodeEntries(nodeEntries);

  const toggleDefaultLegendVisibilityBatch = (
    legendIds: string[],
    visible: boolean,
  ): void => {
    const optimisticUpdates = Object.fromEntries(
      legendIds.map((legendId) => [legendId, { disabled: !visible }]),
    );
    const legendVisibility = Object.fromEntries(
      legendIds.map((legendId) => [legendId, visible]),
    );
    setOptimisticLegendUpdates(optimisticUpdates);
    postMessage({
      type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY_BATCH',
      payload: { legendVisibility },
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <section
      className="bg-[var(--cg-popover-translucent)] backdrop-blur-sm rounded-lg border w-[30rem] max-w-[calc(100vw-2rem)] shadow-lg max-h-full flex flex-col overflow-hidden"
      data-codegraphy-panel="themes"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" data-codegraphy-region="panel-header">
        <span className="text-sm font-medium">Themes</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </header>

      <ScrollArea className="flex-1 min-h-0" data-codegraphy-region="panel-body">
        <div className="space-y-5 px-3 pb-3 pt-2" data-codegraphy-region="theme-sections">
          <ThemePanelSection
            collapsedEntries={collapsedEntries}
            onCollapsedChange={setCollapsedEntry}
            sectionId="legends"
            title="Legends"
          >
            <div className="space-y-4" data-codegraphy-region="legend-sections">
              <LegendSection
                title="Nodes"
                builtInEntries={displayNodeEntries}
                displayRules={displayedNodeLegendRules}
                userRules={nodeLegendRules}
                legends={legends}
                target="node"
                onBuiltInColorChange={(nodeType, color) => {
                  postMessage({
                    type: 'UPDATE_NODE_COLOR',
                    payload: { nodeType, color },
                  });
                }}
                onRulesChange={(nextSectionRules, iconImports) => {
                  sendUserLegendRules(
                    replaceSectionRules(userLegendRules, 'node', nextSectionRules),
                    setOptimisticUserLegends,
                    iconImports,
                  );
                }}
                onToggleDefaultVisibility={(legendId, visible) => {
                  setOptimisticLegendUpdate(legendId, { disabled: !visible });
                  postMessage({
                    type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
                    payload: { legendId, visible },
                  });
                }}
                onToggleDefaultVisibilityBatch={toggleDefaultLegendVisibilityBatch}
                collapsedEntries={collapsedEntries}
                onCollapsedChange={setCollapsedEntry}
              />
              <LegendSection
                title="Edges"
                builtInEntries={edgeEntries}
                displayRules={displayedEdgeLegendRules}
                userRules={edgeLegendRules}
                legends={legends}
                target="edge"
                onBuiltInColorChange={(edgeKind, color) => {
                  sendUserLegendRules(
                    upsertEdgeTypeColorRule(userLegendRules, edgeKind, color),
                    setOptimisticUserLegends,
                  );
                }}
                onRulesChange={(nextSectionRules, iconImports) => {
                  sendUserLegendRules(
                    replaceCustomEdgeRules(userLegendRules, edgeTypeIds, nextSectionRules),
                    setOptimisticUserLegends,
                    iconImports,
                  );
                }}
                onToggleDefaultVisibility={(legendId, visible) => {
                  setOptimisticLegendUpdate(legendId, { disabled: !visible });
                  postMessage({
                    type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
                    payload: { legendId, visible },
                  });
                }}
                onToggleDefaultVisibilityBatch={toggleDefaultLegendVisibilityBatch}
                collapsedEntries={collapsedEntries}
                onCollapsedChange={setCollapsedEntry}
              />
            </div>
          </ThemePanelSection>
          <CssSnippetsSection
            collapsedEntries={collapsedEntries}
            onCollapsedChange={setCollapsedEntry}
            snippets={cssSnippets}
          />
          {pluginHost ? (
            <SlotHost
              pluginHost={pluginHost}
              slot="theme.panel"
              data-codegraphy-section="theme-panel-plugin-slot"
              data-codegraphy-slot="theme-panel"
              data-testid="theme-panel-plugin-slot"
              className="space-y-3"
            />
          ) : null}
        </div>
      </ScrollArea>
    </section>
  );
}
