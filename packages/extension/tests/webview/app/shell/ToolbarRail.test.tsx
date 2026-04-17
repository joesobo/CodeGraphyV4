import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolbarRail } from '../../../../src/webview/app/shell/ToolbarRail';

vi.mock('../../../../src/webview/components/toolbar/view', () => ({
  default: () => <div data-testid="toolbar" />,
}));

describe('app/ToolbarRail', () => {
  it('renders the toolbar inside the inset rail shell', () => {
    render(<ToolbarRail pluginHost={undefined} />);

    const toolbarShell = screen.getByTestId('toolbar').parentElement?.parentElement as HTMLElement | null;
    expect(toolbarShell).toBeTruthy();
    expect(toolbarShell?.className).toContain('absolute');
    expect(toolbarShell?.className).toContain('left-2');
    expect(toolbarShell?.className).toContain('inset-y-2');
  });
});
