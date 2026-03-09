import React, { useState } from 'react';
import { IPluginStatus } from '../../shared/types';
import { postMessage } from '../lib/vscodeApi';
import { cn } from '../lib/utils';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface PluginsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  plugins: IPluginStatus[];
}

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-90')}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  installed: 'secondary',
  inactive: 'outline',
};

export default function PluginsPanel({ isOpen, onClose, plugins }: PluginsPanelProps): React.ReactElement | null {
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleExpanded = (pluginId: string) => {
    setExpandedPlugins(prev => {
      const next = new Set(prev);
      if (next.has(pluginId)) next.delete(pluginId);
      else next.add(pluginId);
      return next;
    });
  };

  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN', payload: { pluginId, enabled } });
  };

  const handleToggleRule = (qualifiedId: string, enabled: boolean) => {
    postMessage({ type: 'TOGGLE_RULE', payload: { qualifiedId, enabled } });
  };

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Plugins</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
              const isInactive = plugin.status === 'inactive';

              return (
                <div key={plugin.id} className={cn(isInactive && 'opacity-50')}>
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
                        disabled={isInactive}
                        className="scale-[0.8] origin-left"
                      />

                      <span className="text-xs flex-1 truncate">{plugin.name}</span>

                      <Badge
                        variant={STATUS_VARIANT[plugin.status] ?? 'outline'}
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {plugin.status}
                      </Badge>

                      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                        {plugin.connectionCount}
                      </span>
                    </div>

                    {/* Expanded rules */}
                    <CollapsibleContent>
                      {plugin.rules.length > 0 ? (
                        <div className="ml-5 mb-2 space-y-1.5">
                          {plugin.rules.map(rule => (
                            <div key={rule.qualifiedId} className="flex items-start gap-2">
                              <div className="flex-shrink-0 pt-0.5">
                                <Switch
                                  checked={rule.enabled}
                                  onCheckedChange={(val) => handleToggleRule(rule.qualifiedId, val)}
                                  disabled={!plugin.enabled}
                                  className="scale-[0.7] origin-left"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <span className={cn(
                                  'text-xs block truncate',
                                  !plugin.enabled ? 'text-muted-foreground/50' : 'text-foreground'
                                )}>
                                  {rule.name}
                                </span>
                                {rule.description && (
                                  <span className="text-[10px] text-muted-foreground block truncate">
                                    {rule.description}
                                  </span>
                                )}
                              </div>

                              <span className={cn(
                                'text-xs flex-shrink-0 tabular-nums',
                                !plugin.enabled ? 'text-muted-foreground/50' : 'text-muted-foreground'
                              )}>
                                {rule.connectionCount}
                              </span>
                            </div>
                          ))}

                          {plugin.supportedExtensions.length > 0 && (
                            <div className="pt-1 text-[10px] text-muted-foreground">
                              Extensions: {plugin.supportedExtensions.map(ext => `.${ext}`).join(', ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="ml-5 mb-2">
                          <p className="text-xs text-muted-foreground">No rules declared.</p>
                          {plugin.supportedExtensions.length > 0 && (
                            <div className="pt-1 text-[10px] text-muted-foreground">
                              Extensions: {plugin.supportedExtensions.map(ext => `.${ext}`).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {index < plugins.length - 1 && <Separator className="opacity-50" />}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
