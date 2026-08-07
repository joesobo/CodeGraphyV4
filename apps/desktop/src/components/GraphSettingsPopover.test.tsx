import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphSettingsPopover } from './GraphSettingsPopover';

const settings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 1,
  damping: 0.4,
  centerForce: 0.1,
};

describe('GraphSettingsPopover', () => {
  beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('exposes the focused extension force controls and restores trigger focus on Escape', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const onChange = vi.fn();
    const onCommit = vi.fn();

    await act(async () => {
      root.render(
        <GraphSettingsPopover
          onChange={onChange}
          onCommit={onCommit}
          onReset={vi.fn()}
          settings={settings}
        />,
      );
    });
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Graph Settings"]');
    await act(async () => trigger?.click());

    expect(host.querySelector('dialog')).not.toBeNull();
    const repel = host.querySelector<HTMLInputElement>('#graph-setting-repelForce');
    const center = host.querySelector<HTMLInputElement>('#graph-setting-centerForce');
    const distance = host.querySelector<HTMLInputElement>('#graph-setting-linkDistance');
    expect(document.activeElement).toBe(repel);
    expect([repel?.min, repel?.max, repel?.step]).toEqual(['0', '20', '1']);
    expect([center?.min, center?.max, center?.step]).toEqual(['0', '1', '0.01']);
    expect([distance?.min, distance?.max, distance?.step]).toEqual(['30', '150', '10']);

    await act(async () => {
      if (!repel) return;
      repel.value = '14';
      repel.dispatchEvent(new Event('input', { bubbles: true }));
      repel.dispatchEvent(new Event('pointerup', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('repelForce', 14);
    expect(onCommit).toHaveBeenCalled();

    await act(async () => {
      repel?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    });
    await act(async () => undefined);
    expect(host.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await act(async () => root.unmount());
  });
});
