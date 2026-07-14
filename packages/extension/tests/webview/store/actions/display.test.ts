import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness } from './harness';

describe('webview/store/actions/display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates every display and panel setter', () => {
    const { actions, getState } = createHarness();
    const legends = [{ id: 'custom', pattern: 'docs/**', color: '#F59E0B' }];
    const physicsSettings = {
      repelForce: 20,
      linkDistance: 120,
      linkForce: 0.3,
      damping: 0.5,
      centerForce: 0.2,
    };

    actions.setExpandedGroupId('group-a');
    actions.setSearchQuery('needle');
    actions.setSearchOptions({ matchCase: true, wholeWord: true, regex: true });
    actions.setActivePanel('legends');
    actions.setGraphViewportScale(1.5);
    actions.setNodeSizeMode('connections');
    actions.setPhysicsSettings(physicsSettings);
    actions.setLegends(legends);
    actions.setFilterPatterns(['src/**']);
    actions.setDisabledCustomFilterPatterns(['docs/**']);
    actions.setDisabledPluginFilterPatterns(['*.md']);
    actions.setShowOrphans(false);
    actions.setShowLabels(false);

    expect(getState()).toMatchObject({
      activePanel: 'legends',
      disabledCustomFilterPatterns: ['docs/**'],
      disabledPluginFilterPatterns: ['*.md'],
      expandedGroupId: 'group-a',
      filterPatterns: ['src/**'],
      graphViewportScale: 1.5,
      legends,
      nodeSizeMode: 'connections',
      physicsSettings,
      searchOptions: { matchCase: true, wholeWord: true, regex: true },
      searchQuery: 'needle',
      showLabels: false,
      showOrphans: false,
    });
  });
});
