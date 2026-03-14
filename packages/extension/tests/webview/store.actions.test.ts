import { beforeEach, describe, expect, it } from 'vitest';
import { createGraphStore } from '../../src/webview/store';

describe('GraphStore actions', () => {
  let store: ReturnType<typeof createGraphStore>;

  beforeEach(() => {
    store = createGraphStore();
  });

  it('setExpandedGroupId updates the expanded group', () => {
    store.getState().setExpandedGroupId('group-a');

    expect(store.getState().expandedGroupId).toBe('group-a');
  });

  it('setSearchOptions updates search options', () => {
    const options = { matchCase: true, wholeWord: true, regex: false };

    store.getState().setSearchOptions(options);

    expect(store.getState().searchOptions).toEqual(options);
  });

  it('setGraphMode updates the graph mode', () => {
    store.getState().setGraphMode('3d');

    expect(store.getState().graphMode).toBe('3d');
  });

  it('setNodeSizeMode updates the node size mode', () => {
    store.getState().setNodeSizeMode('file-size');

    expect(store.getState().nodeSizeMode).toBe('file-size');
  });

  it('setPhysicsSettings updates physics settings', () => {
    const physicsSettings = {
      repelForce: 12,
      linkDistance: 96,
      linkForce: 0.2,
      damping: 0.55,
      centerForce: 0.15,
    };

    store.getState().setPhysicsSettings(physicsSettings);

    expect(store.getState().physicsSettings).toEqual(physicsSettings);
  });

  it('setGroups updates the active groups', () => {
    const groups = [{ id: 'docs', pattern: 'docs/**', color: '#00ff00' }];

    store.getState().setGroups(groups);

    expect(store.getState().groups).toEqual(groups);
  });

  it('setFilterPatterns updates filter patterns', () => {
    store.getState().setFilterPatterns(['**/*.spec.ts']);

    expect(store.getState().filterPatterns).toEqual(['**/*.spec.ts']);
  });

  it('setShowOrphans updates the orphan visibility flag', () => {
    store.getState().setShowOrphans(false);

    expect(store.getState().showOrphans).toBe(false);
  });

  it('setDirectionMode updates the direction mode', () => {
    store.getState().setDirectionMode('particles');

    expect(store.getState().directionMode).toBe('particles');
  });

  it('setDirectionColor updates the direction color', () => {
    store.getState().setDirectionColor('#00ff00');

    expect(store.getState().directionColor).toBe('#00ff00');
  });

  it('setParticleSpeed updates the particle speed', () => {
    store.getState().setParticleSpeed(0.02);

    expect(store.getState().particleSpeed).toBe(0.02);
  });

  it('setParticleSize updates the particle size', () => {
    store.getState().setParticleSize(7);

    expect(store.getState().particleSize).toBe(7);
  });

  it('setBidirectionalMode updates the bidirectional edge mode', () => {
    store.getState().setBidirectionalMode('combined');

    expect(store.getState().bidirectionalMode).toBe('combined');
  });

  it('setShowLabels updates label visibility', () => {
    store.getState().setShowLabels(false);

    expect(store.getState().showLabels).toBe(false);
  });

  it('setActiveViewId updates the active view id', () => {
    store.getState().setActiveViewId('codegraphy.depth-graph');

    expect(store.getState().activeViewId).toBe('codegraphy.depth-graph');
  });

  it('setFolderNodeColor updates the folder node color', () => {
    store.getState().setFolderNodeColor('#ff00ff');

    expect(store.getState().folderNodeColor).toBe('#ff00ff');
  });

  it('setMaxFiles updates the file limit', () => {
    store.getState().setMaxFiles(1200);

    expect(store.getState().maxFiles).toBe(1200);
  });
});
