import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanelStack } from '../../../../src/webview/app/shell/PanelStack';

const slotHostSpy = vi.fn();
vi.mock('../../../../src/webview/pluginHost/slotHost/view', () => ({
  SlotHost: (props: Record<string, unknown>) => {
    slotHostSpy(props);
    return <div data-testid="node-details-slot" />;
  },
}));

vi.mock('../../../../src/webview/components/settingsPanel/Drawer', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="settings-panel" /> : null),
}));

vi.mock('../../../../src/webview/components/plugins/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="plugins-panel" /> : null),
}));

vi.mock('../../../../src/webview/components/legends/panel/view', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="legends-panel" /> : null),
}));

vi.mock('../../../../src/webview/components/nodes/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="nodes-panel" /> : null),
}));

vi.mock('../../../../src/webview/components/edges/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="edges-panel" /> : null),
}));

vi.mock('../../../../src/webview/components/export/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="export-panel" /> : null),
}));

vi.mock('../../../../src/webview/components/graphCornerControls/view', () => ({
  GraphCornerControls: () => <div data-testid="graph-corner-controls" />,
}));

describe('app/PanelStack', () => {
  it('renders the requested panel and keeps the node details slot mounted', () => {
    const pluginHost = { kind: 'host' };
    render(
      <PanelStack
        activePanel="plugins"
        hasGraphNodes
        pluginHost={pluginHost as never}
        onClosePanel={() => {}}
      />,
    );

    expect(screen.getByTestId('node-details-slot')).toBeInTheDocument();
    expect(screen.getByTestId('plugins-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('graph-corner-controls')).not.toBeInTheDocument();
    expect(slotHostSpy).toHaveBeenCalledWith(expect.objectContaining({
      pluginHost,
      slot: 'node-details',
      'data-testid': 'node-details-slot',
      className: expect.stringContaining('bg-popover/95'),
    }));
  });

  it('shows corner controls only when no right panel is open and nodes exist', () => {
    const { rerender } = render(
      <PanelStack
        activePanel="none"
        hasGraphNodes
        pluginHost={undefined as never}
        onClosePanel={() => {}}
      />,
    );

    expect(screen.getByTestId('graph-corner-controls')).toBeInTheDocument();

    rerender(
      <PanelStack
        activePanel="none"
        hasGraphNodes={false}
        pluginHost={undefined as never}
        onClosePanel={() => {}}
      />,
    );

    expect(screen.queryByTestId('graph-corner-controls')).not.toBeInTheDocument();
  });

  it.each([
    ['settings', 'settings-panel'],
    ['export', 'export-panel'],
    ['nodes', 'nodes-panel'],
    ['edges', 'edges-panel'],
    ['legends', 'legends-panel'],
  ])('renders the %s panel when it is active', (activePanel, testId) => {
    render(
      <PanelStack
        activePanel={activePanel}
        hasGraphNodes
        pluginHost={undefined as never}
        onClosePanel={() => {}}
      />,
    );

    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(screen.queryByTestId('graph-corner-controls')).not.toBeInTheDocument();
  });
});
