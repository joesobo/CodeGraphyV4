import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceSection } from '../../../../src/webview/components/settingsPanel/performance/Section';
import { graphStore } from '../../../../src/webview/store/state';

const sentMessages: unknown[] = [];

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('PerformanceSection', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    graphStore.setState({ maxFiles: 20, showFps: false, verboseDiagnostics: false });
  });

  it('commits max files through blur and enter handlers', () => {
    render(<PerformanceSection />);

    const input = screen.getByDisplayValue('20');
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.keyDown(input, { key: 'Enter', currentTarget: { value: '42' } });

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_MAX_FILES',
      payload: { maxFiles: 42 },
    });

    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.blur(input, { target: { value: '5' } });

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_MAX_FILES',
      payload: { maxFiles: 5 },
    });
  });

  it('toggles verbose diagnostics through the Performance settings section', () => {
    render(<PerformanceSection />);

    const toggle = screen.getByRole('switch', { name: 'Verbose Diagnostics' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);

    expect(graphStore.getState().verboseDiagnostics).toBe(true);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_VERBOSE_DIAGNOSTICS',
      payload: { verboseDiagnostics: true },
    });
  });

  it('toggles the FPS counter through the Performance settings section', () => {
    render(<PerformanceSection />);

    const toggle = screen.getByRole('switch', { name: 'Show FPS' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);

    expect(graphStore.getState().showFps).toBe(true);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_FPS',
      payload: { showFps: true },
    });
  });
});
