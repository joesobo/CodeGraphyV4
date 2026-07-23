import { describe, expect, it } from 'vitest';
import {
  TOOLBAR_PANEL_BUTTONS,
} from '../../../../src/webview/components/toolbar/actions/model';

describe('webview/toolbar/model', () => {
  it('exposes the core panel buttons', () => {
    expect(TOOLBAR_PANEL_BUTTONS.map((button) => button.title)).toEqual([
      'Graph Scope',
      'Themes',
      'Plugins',
      'Settings',
    ]);
  });
});
