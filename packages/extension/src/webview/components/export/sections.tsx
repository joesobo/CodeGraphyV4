import React from 'react';
import {
  getPluginExporterKey,
  type PluginExporterGroup,
} from './model';
import {
  runPluginExport,
  type ExportActionItem,
} from './actions';

export function ExportSection({
  title,
  items,
}: {
  title: string;
  items: ExportActionItem[];
}): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-xs transition-colors hover:bg-accent/20"
            onClick={item.onSelect}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function PluginExportSection({
  groups,
}: {
  groups: PluginExporterGroup[];
}): React.ReactElement | null {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Plugins
      </h3>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="text-[11px] font-medium text-muted-foreground">
              {group.label}
            </div>
            <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
              {group.items.map((item) => (
                <button
                  key={getPluginExporterKey(item)}
                  type="button"
                  className="flex w-full items-center px-3 py-2 text-left text-xs transition-colors hover:bg-accent/20"
                  onClick={() => runPluginExport(item.pluginId, item.index)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
