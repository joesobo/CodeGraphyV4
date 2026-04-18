import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const exportSectionsHarness = vi.hoisted(() => ({
  runPluginExport: vi.fn(),
}));

vi.mock('../../../../src/webview/components/export/actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/webview/components/export/actions')>();
  return {
    ...actual,
    runPluginExport: exportSectionsHarness.runPluginExport,
  };
});

import { ExportSection, PluginExportSection } from '../../../../src/webview/components/export/sections';

describe('webview/components/export/sections', () => {
  it('renders nothing when an export section has no items', () => {
    const { container } = render(<ExportSection title="Graph" items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders export actions and runs plugin exports for grouped plugin items', () => {
    const onSelect = vi.fn();

    render(
      <>
        <ExportSection
          title="Graph"
          items={[{ id: 'json', label: 'JSON', onSelect }]}
        />
        <PluginExportSection
          groups={[
            {
              key: 'plugin.test',
              label: 'Plugin Test',
              items: [
                {
                  id: 'custom-export',
                  pluginId: 'plugin.test',
                  pluginName: 'Plugin Test',
                  index: 1,
                  label: 'Custom Export',
                },
              ],
            },
          ]}
        />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'Custom Export' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(exportSectionsHarness.runPluginExport).toHaveBeenCalledWith('plugin.test', 1);
  });
});
