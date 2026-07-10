import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetSettingsAction } from '../../../src/extension/actions/resetSettings';
import type { ISettingsSnapshot } from '../../../src/shared/settings/snapshot';

const update = vi.fn();

vi.mock('../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: () => ({ update }),
}));

const SNAPSHOT: ISettingsSnapshot = {
  physics: {
    repelForce: 11,
    linkDistance: 22,
    linkForce: 0.33,
    damping: 0.44,
    centerForce: 0.55,
  },
  legends: [{ id: 'legend-1', pattern: 'src/**', color: '#123456' }],
  filterPatterns: ['dist/**'],
  disabledCustomFilterPatterns: ['build/**'],
  disabledPluginFilterPatterns: ['plugin/**'],
  pluginData: {},
  showOrphans: false,
  bidirectionalMode: 'combined',
  directionMode: 'particles',
  directionColor: '#abcdef',
  nodeColors: { file: '#111111' },
  nodeVisibility: { file: true },
  edgeVisibility: { import: false },
  legendVisibility: { 'legend-1': true },
  legendOrder: ['legend-1'],
  particleSpeed: 0.75,
  particleSize: 6,
  showLabels: false,
  maxFiles: 321,
  verboseDiagnostics: true,
  nodeSizeMode: 'uniform',
};

describe('extension/actions/resetSettings', () => {
  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue(undefined);
  });

  it('resets every persisted setting key before restoring node size defaults', async () => {
    const action = createAction();

    await action.execute();

    expect(update.mock.calls).toEqual([
      ['physics.repelForce', undefined],
      ['physics.linkDistance', undefined],
      ['physics.linkForce', undefined],
      ['physics.damping', undefined],
      ['physics.centerForce', undefined],
      ['legend', undefined],
      ['filterPatterns', undefined],
      ['disabledCustomFilterPatterns', undefined],
      ['disabledPluginFilterPatterns', undefined],
      ['showOrphans', undefined],
      ['bidirectionalEdges', undefined],
      ['directionMode', undefined],
      ['directionColor', undefined],
      ['nodeColors', undefined],
      ['nodeVisibility', undefined],
      ['edgeVisibility', undefined],
      ['legendVisibility', undefined],
      ['legendOrder', undefined],
      ['particleSpeed', undefined],
      ['particleSize', undefined],
      ['showLabels', undefined],
      ['maxFiles', undefined],
      ['verboseDiagnostics', undefined],
      ['nodeSizeMode', 'connections'],
    ]);
  });

  it('restores every persisted setting key from the captured snapshot', async () => {
    const action = createAction();

    await action.undo();

    expect(update.mock.calls).toEqual([
      ['physics.repelForce', 11],
      ['physics.linkDistance', 22],
      ['physics.linkForce', 0.33],
      ['physics.damping', 0.44],
      ['physics.centerForce', 0.55],
      ['legend', SNAPSHOT.legends],
      ['filterPatterns', SNAPSHOT.filterPatterns],
      ['disabledCustomFilterPatterns', SNAPSHOT.disabledCustomFilterPatterns],
      ['disabledPluginFilterPatterns', SNAPSHOT.disabledPluginFilterPatterns],
      ['showOrphans', false],
      ['bidirectionalEdges', 'combined'],
      ['directionMode', 'particles'],
      ['directionColor', '#abcdef'],
      ['nodeColors', SNAPSHOT.nodeColors],
      ['nodeVisibility', SNAPSHOT.nodeVisibility],
      ['edgeVisibility', SNAPSHOT.edgeVisibility],
      ['legendVisibility', SNAPSHOT.legendVisibility],
      ['legendOrder', SNAPSHOT.legendOrder],
      ['particleSpeed', 0.75],
      ['particleSize', 6],
      ['showLabels', false],
      ['maxFiles', 321],
      ['verboseDiagnostics', true],
      ['nodeSizeMode', 'uniform'],
    ]);
  });
});

function createAction(): ResetSettingsAction {
  return new ResetSettingsAction(
    SNAPSHOT,
    undefined,
    undefined,
    vi.fn(),
    vi.fn(),
    vi.fn().mockResolvedValue(undefined),
  );
}
