import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../src/shared/settings/physics';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import SettingsPanel from '../../../src/webview/components/settingsPanel/Drawer';
import { graphStore } from '../../../src/webview/store/state';

const sentMessages: unknown[] = [];
vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

const DEFAULT_PHYSICS: IPhysicsSettings = {
  repelForce: 5,
  centerForce: 0.01,
  linkDistance: 100,
  linkForce: 0.08,
  damping: 0.4,
};

function setStoreState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    physicsSettings: DEFAULT_PHYSICS,
    legends: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    showOrphans: true,
    nodeSizeMode: 'connections',
    depthLimit: 1,
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    graphMode: '2d',
    maxFiles: 500,
    graphHasIndex: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
    depthMode: false,
    maxDepthLimit: 10,
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    ...overrides,
  });
}

function renderPanel(storeOverrides: Record<string, unknown> = {}) {
  setStoreState(storeOverrides);
  const onClose = vi.fn();
  const result = render(<SettingsPanel isOpen={true} onClose={onClose} />);
  return { ...result, onClose };
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('returns null when closed', () => {
    setStoreState();
    const { container } = render(<SettingsPanel isOpen={false} onClose={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('keeps the forces section collapsed by default', () => {
    renderPanel();

    expect(screen.queryByText('Repel Force')).not.toBeInTheDocument();
  });

  it('renders filter content when the filters section is opened', () => {
    renderPanel();

    fireEvent.click(screen.getByText('Filters'));

    expect(screen.getByText('Show Orphans')).toBeInTheDocument();
  });

  it('renders display content when the display section is opened', () => {
    renderPanel();

    fireEvent.click(screen.getByText('Display'));

    expect(screen.getByText('Direction')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByTitle('Close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('sends RESET_ALL_SETTINGS when reset is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTitle('Reset Settings'));

    expect(sentMessages).toContainEqual({ type: 'RESET_ALL_SETTINGS' });
  });

  it('applies local slider updates and persists the latest physics value', () => {
    vi.useFakeTimers();
    renderPanel();
    fireEvent.click(screen.getByText('Forces'));

    const repelSlider = screen.getAllByRole('slider').find(
      (element) =>
        element.getAttribute('aria-valuemin') === '0' &&
        element.getAttribute('aria-valuemax') === '20'
    );

    expect(repelSlider).toBeTruthy();

    fireEvent.keyDown(repelSlider!, { key: 'ArrowRight' });

    expect(graphStore.getState().physicsSettings.repelForce).toBe(6);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'repelForce', value: 6 },
    });
    vi.useRealTimers();
  });
});
