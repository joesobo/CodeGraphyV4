import React from 'react';
import { useGraphStore } from '../../../store/state';
import { buildGraphItems, buildImageItems } from '../../export/actions';
import { buildPluginExporterGroups } from '../../export/model';
import { ExportSection, PluginExportSection } from '../../export/sections';

export function SettingsExportSection(): React.ReactElement {
  const pluginExporters = useGraphStore((state) => state.pluginExporters);
  const pluginExporterGroups = buildPluginExporterGroups(pluginExporters);

  return (
    <section className="mb-2 space-y-4" data-codegraphy-section="settings-export">
      <ExportSection title="Images" items={buildImageItems()} />
      <ExportSection title="Graph" items={buildGraphItems()} />
      <PluginExportSection groups={pluginExporterGroups} />
    </section>
  );
}
