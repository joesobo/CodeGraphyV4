import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanelStack } from '../../../src/webview/app/PanelStack';

vi.mock('../../../src/webview/pluginHost/slotHost/view', () => ({
  SlotHost: () => <div data-testid="node-details-slot" />,
}));

vi.mock('../../../src/webview/components/settingsPanel/Drawer', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="settings-panel" /> : null),
}));

vi.mock('../../../src/webview/components/plugins/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="plugins-panel" /> : null),
}));

vi.mock('../../../src/webview/components/legends/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="legends-panel" /> : null),
}));

vi.mock('../../../src/webview/components/nodes/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="nodes-panel" /> : null),
}));

vi.mock('../../../src/webview/components/edges/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="edges-panel" /> : null),
}));

vi.mock('../../../src/webview/components/export/Panel', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="export-panel" /> : null),
}));

vi.mock('../../../src/webview/components/graphCornerControls/view', () => ({
  GraphCornerControls: () => <div data-testid="graph-corner-controls" />,
}));

describe('app/PanelStack', () => {
  it('renders the requested panel and keeps the node details slot mounted', () => {
    render(
      <PanelStack
        activePanel="plugins"
        hasGraphNodes
        pluginHost={undefined as never}
        onClosePanel={() => {}}
      />,
    );

    expect(screen.getByTestId('node-details-slot')).toBeInTheDocument();
    expect(screen.getByTestId('plugins-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('graph-corner-controls')).not.toBeInTheDocument();
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
});
