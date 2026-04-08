import React, { useState } from 'react';
import { postMessage } from '../../vscodeApi';
import { useGraphStore } from '../../store/state';
import { cn } from '../ui/cn';
import { mdiChevronRight, mdiClose } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/disclosure/collapsible';
import {
  getPluginsPanelChevronClassName,
  getPluginsPanelRuleCountClassName,
  getPluginsPanelRuleLabelClassName,
  getPluginsPanelWrapperClassName,
  shouldRenderPluginsPanelRuleDescription,
  shouldRenderPluginsPanelSeparator,
  toggleExpandedPluginIds,
} from './model';

interface PluginsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <MdiIcon path={mdiChevronRight} size={12} className={getPluginsPanelChevronClassName(open)} />
);

export default function PluginsPanel({ isOpen, onClose }: PluginsPanelProps): React.ReactElement | null {
  const plugins = useGraphStore(s => s.pluginStatuses);
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleExpanded = (pluginId: string) => {
    setExpandedPlugins((prev) => toggleExpandedPluginIds(prev, pluginId));
  };

  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN', payload: { pluginId, enabled } });
  };

  const handleToggleRule = (qualifiedSourceId: string, enabled: boolean) => {
    postMessage({ type: 'TOGGLE_SOURCE', payload: { qualifiedSourceId, enabled } });
  };

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Plugins</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>

      {/* Scrollable plugin list */}
      <ScrollArea className="flex-1">
        <div className="px-3 pb-3">
          {plugins.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No plugins registered.</p>
          ) : (
            plugins.map((plugin, index) => {
              const isExpanded = expandedPlugins.has(plugin.id);

              return (
                <div key={plugin.id} className={getPluginsPanelWrapperClassName(plugin.enabled)}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(plugin.id)}>
                    {/* Plugin header */}
                    <div className="flex items-center gap-2 py-2.5">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0 p-0">
                          <ChevronIcon open={isExpanded} />
                        </Button>
                      </CollapsibleTrigger>

                      <Switch
                        checked={plugin.enabled}
                        onCheckedChange={(val) => handleTogglePlugin(plugin.id, val)}
                        className="scale-[0.8] origin-left"
                      />

                      <span className="text-xs flex-1 truncate">{plugin.name}</span>

                      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                        {plugin.connectionCount}
                      </span>
                    </div>

                    {/* Expanded sources */}
                    <CollapsibleContent>
                      {plugin.sources.length > 0 ? (
                        <div className="ml-5 mb-2 space-y-1.5">
                          {plugin.sources.map(rule => (
                            <div key={rule.qualifiedSourceId} className="flex items-start gap-2">
                              <div className="flex-shrink-0 pt-0.5">
                                <Switch
                                  checked={rule.enabled}
                                  onCheckedChange={(val) => handleToggleRule(rule.qualifiedSourceId, val)}
                                  disabled={!plugin.enabled}
                                  className="scale-[0.7] origin-left"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <span className={cn(
                                  'text-xs block truncate',
                                  getPluginsPanelRuleLabelClassName(plugin.enabled)
                                )}>
                                  {rule.name}
                                </span>
                                {shouldRenderPluginsPanelRuleDescription(rule.description) && (
                                  <span className="text-[10px] text-muted-foreground block truncate">
                                    {rule.description}
                                  </span>
                                )}
                              </div>

                              <span className={cn(
                                'text-xs flex-shrink-0 tabular-nums',
                                getPluginsPanelRuleCountClassName(plugin.enabled)
                              )}>
                                {rule.connectionCount}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="ml-5 mb-2">
                          <p className="text-xs text-muted-foreground">No sources declared.</p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {shouldRenderPluginsPanelSeparator(index, plugins.length) && <Separator className="opacity-50" />}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
