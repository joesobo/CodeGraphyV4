import { describe, expect, it } from 'vitest';
import {
  getDisplayViewState,
} from '../../../../../src/webview/components/settingsPanel/display/state/selectors';

describe('display viewState', () => {
  it('derives display values and visibility flags from display state', () => {
    expect(
      getDisplayViewState({
        bidirectionalMode: 'combined',
        directionMode: 'particles',
        graphMode: '3d',
        particleSpeed: 0.0015,
      }),
    ).toMatchObject({
      displayParticleSpeed: 3,
      showParticleControls: true,
    });
  });
});
