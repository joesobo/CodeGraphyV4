import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LegendColorInput } from '../../../../src/webview/components/legends/panel/section/colorInput';

describe('webview/components/legends/colorInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces color commits and only flushes the latest pending value', () => {
    const onCommit = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    render(
      <LegendColorInput
        ariaLabel="Legend color"
        color="#112233"
        onCommit={onCommit}
      />,
    );

    const input = screen.getByLabelText('Legend color');
    fireEvent.change(input, { target: { value: '#223344' } });
    fireEvent.change(input, { target: { value: '#334455' } });
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(149);
    expect(onCommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('#334455');
    expect((input as HTMLInputElement).value).toBe('#334455');
  });

  it('flushes pending changes on blur and commits immediately when configured', () => {
    const onCommit = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { rerender } = render(
      <LegendColorInput
        ariaLabel="Legend color"
        color="#112233"
        onCommit={onCommit}
      />,
    );

    const input = screen.getByLabelText('Legend color');
    fireEvent.change(input, { target: { value: '#445566' } });
    fireEvent.blur(input);
    vi.runAllTimers();

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('#445566');
    expect(clearTimeoutSpy).toHaveBeenCalled();

    rerender(
      <LegendColorInput
        ariaLabel="Legend color"
        color="#445566"
        onCommit={onCommit}
      />,
    );

    fireEvent.blur(screen.getByLabelText('Legend color'));
    expect(onCommit).toHaveBeenCalledTimes(1);

    rerender(
      <LegendColorInput
        ariaLabel="Legend color"
        color="#778899"
        onCommit={onCommit}
        immediate
      />,
    );

    const immediateInput = screen.getByLabelText('Legend color');
    expect((immediateInput as HTMLInputElement).value).toBe('#778899');
    expect(screen.getByTitle('Edit Legend color')).toHaveStyle({ backgroundColor: '#778899' });

    fireEvent.change(immediateInput, { target: { value: '#99aabb' } });
    vi.runAllTimers();

    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(onCommit).toHaveBeenLastCalledWith('#99AABB');
  });

  it('clears pending timeouts on unmount', () => {
    const onCommit = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const firstRender = render(
      <LegendColorInput
        ariaLabel="Legend color"
        color="#112233"
        onCommit={onCommit}
      />,
    );

    firstRender.unmount();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();

    const secondRender = render(
      <LegendColorInput
        ariaLabel="Legend color"
        color="#112233"
        onCommit={onCommit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Legend color'), { target: { value: '#abcdef' } });
    secondRender.unmount();
    vi.runAllTimers();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits rgba colors when the opacity slider changes', () => {
    const onCommit = vi.fn();
    render(
      <LegendColorInput
        ariaLabel="Legend color"
        color="#112233"
        onCommit={onCommit}
      />,
    );

    fireEvent.click(screen.getByTitle('Edit Legend color'));
    fireEvent.keyDown(screen.getByLabelText('Legend color opacity'), { key: 'Home' });
    vi.runAllTimers();

    expect(onCommit).toHaveBeenLastCalledWith('rgba(17, 34, 51, 0)');
  });
});
