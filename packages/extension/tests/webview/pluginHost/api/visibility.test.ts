import { describe, expect, it } from 'vitest';
import { syncSlotHostVisibility } from '../../../../src/webview/pluginHost/api/visibility';

describe('pluginHost/api/visibility', () => {
  it('shows the slot host when it has children and hides it when empty', () => {
    const slotHosts = new Map<string, HTMLDivElement>();
    const host = document.createElement('div');
    slotHosts.set('toolbar', host);

    syncSlotHostVisibility('toolbar', slotHosts);
    expect(host.style.display).toBe('none');

    host.appendChild(document.createElement('div'));
    syncSlotHostVisibility('toolbar', slotHosts);
    expect(host.style.display).toBe('');
  });

  it('does nothing when the slot host is missing', () => {
    expect(() => syncSlotHostVisibility('toolbar', new Map())).not.toThrow();
  });
});
