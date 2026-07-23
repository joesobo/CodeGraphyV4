import React from 'react';
import { buildGraphItems, buildImageItems } from '../../export/actions';
import { ExportSection } from '../../export/sections';

export function SettingsExportSection(): React.ReactElement {
  return (
    <section className="mb-2 space-y-4" data-codegraphy-section="settings-export">
      <ExportSection title="Images" items={buildImageItems()} />
      <ExportSection title="Graph" items={buildGraphItems()} />
    </section>
  );
}
