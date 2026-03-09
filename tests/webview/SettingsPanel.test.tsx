/**
 * @fileoverview Tests for the SettingsPanel component.
 * Covers: filter patterns, color groups, orphan toggle, arrows toggle, node size.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SettingsPanel from '../../src/webview/components/SettingsPanel';
import type { IPhysicsSettings, IGroup } from '../../src/shared/types';

// Capture postMessage calls from the panel
const sentMessages: unknown[] = [];
vi.mock('../../src/webview/lib/vscodeApi', () => ({
  postMessage: (msg: unknown) => sentMessages.push(msg),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

const DEFAULT_PHYSICS: IPhysicsSettings = {
  repelForce: 5,
  centerForce: 0.01,
  linkDistance: 100,
  linkForce: 0.08,
  damping: 0.4,
};

function openSection(label: string) {
  const btn = screen.getByText(label);
  fireEvent.click(btn);
}

function renderPanel(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}) {
  const props = makeProps(overrides);

  const result = render(<SettingsPanel {...props} />);
  return { ...result, props };
}

function makeProps(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}): Parameters<typeof SettingsPanel>[0] {
  return {
    isOpen: true,
    onClose: vi.fn(),
    settings: DEFAULT_PHYSICS,
    onSettingsChange: vi.fn(),
    groups: [] as IGroup[],
    onGroupsChange: vi.fn(),
    filterPatterns: [] as string[],
    onFilterPatternsChange: vi.fn(),
    pluginFilterPatterns: [] as string[],
    showOrphans: true,
    onShowOrphansChange: vi.fn(),
    nodeSizeMode: 'connections' as const,
    onNodeSizeModeChange: vi.fn(),
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    onViewChange: vi.fn(),
    depthLimit: 1,
    showArrows: true,
    onShowArrowsChange: vi.fn(),
    showLabels: true,
    onShowLabelsChange: vi.fn(),
    graphMode: '2d' as const,
    onGraphModeChange: vi.fn(),
    ...overrides,
  };
}

// ── Filter Patterns ────────────────────────────────────────────────────────

describe('SettingsPanel: Filter Patterns', () => {
  beforeEach(() => sentMessages.length = 0);

  it('shows existing filter patterns', () => {
    renderPanel({ filterPatterns: ['**/*.test.ts', '**/*.spec.ts'] });
    openSection('Filters');
    expect(screen.getByText('**/*.test.ts')).toBeInTheDocument();
    expect(screen.getByText('**/*.spec.ts')).toBeInTheDocument();
  });

  it('shows plugin default patterns as read-only', () => {
    renderPanel({ pluginFilterPatterns: ['**/*.uid'] });
    openSection('Filters');
    expect(screen.getByText('**/*.uid')).toBeInTheDocument();
    expect(screen.getByText(/Plugin defaults/i)).toBeInTheDocument();
  });

  it('adds a new filter pattern and posts UPDATE_FILTER_PATTERNS', () => {
    const onFilterPatternsChange = vi.fn();
    renderPanel({ filterPatterns: [], onFilterPatternsChange });
    openSection('Filters');

    const input = screen.getByPlaceholderText('*.png');
    fireEvent.change(input, { target: { value: '**/*.log' } });
    fireEvent.click(screen.getByText('Add'));

    expect(onFilterPatternsChange).toHaveBeenCalledWith(['**/*.log']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['**/*.log'] },
    });
  });

  it('removes a filter pattern and posts UPDATE_FILTER_PATTERNS', () => {
    const onFilterPatternsChange = vi.fn();
    renderPanel({ filterPatterns: ['**/*.log'], onFilterPatternsChange });
    openSection('Filters');

    const removeBtn = screen.getByTitle('Delete pattern');
    fireEvent.click(removeBtn);

    expect(onFilterPatternsChange).toHaveBeenCalledWith([]);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: [] },
    });
  });

  it('shows orphan toggle and posts UPDATE_SHOW_ORPHANS', () => {
    const onShowOrphansChange = vi.fn();
    renderPanel({ showOrphans: true, onShowOrphansChange });
    openSection('Filters');

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(onShowOrphansChange).toHaveBeenCalledWith(false);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_ORPHANS',
      payload: { showOrphans: false },
    });
  });
});

describe('SettingsPanel: Quick Actions', () => {
  beforeEach(() => sentMessages.length = 0);

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<SettingsPanel {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(<SettingsPanel {...makeProps({ isOpen: false })} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('SettingsPanel: Physics persistence', () => {
  beforeEach(() => sentMessages.length = 0);

  it('applies local updates on slider interaction and persists physics settings', () => {
    vi.useFakeTimers();
    const onSettingsChange = vi.fn();
    renderPanel({ onSettingsChange });

    // Radix Slider renders thumbs as span[role="slider"]
    const sliders = screen.getAllByRole('slider');
    // The repel force slider is the first one (min=0, max=20, step=1)
    const repelSlider = sliders.find(
      (el) =>
        el.getAttribute('aria-valuemin') === '0' &&
        el.getAttribute('aria-valuemax') === '20'
    );

    expect(repelSlider).toBeTruthy();

    // Simulate slider value change via keyboard (ArrowRight increments by step)
    fireEvent.keyDown(repelSlider!, { key: 'ArrowRight' });

    // Local state update fired immediately
    expect(onSettingsChange).toHaveBeenCalledTimes(1);

    // After debounce period, message is flushed
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Physics message sent with incremented value (5 → 6)
    const physicsMessages = sentMessages.filter(
      (msg) => (msg as { type?: string }).type === 'UPDATE_PHYSICS_SETTING'
    );
    expect(physicsMessages.length).toBeGreaterThanOrEqual(1);
    expect(physicsMessages[physicsMessages.length - 1]).toEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'repelForce', value: 6 },
    });

    vi.useRealTimers();
  });
});

// ── Groups ─────────────────────────────────────────────────────────────────

describe('SettingsPanel: Groups', () => {
  beforeEach(() => sentMessages.length = 0);

  it('shows existing groups', () => {
    renderPanel({
      groups: [{ id: 'g1', pattern: 'src/components/**', color: '#ff0000' }],
    });
    openSection('Groups');
    expect(screen.getByText('src/components/**')).toBeInTheDocument();
  });

  it('adds a new group and posts UPDATE_GROUPS', () => {
    const onGroupsChange = vi.fn();
    renderPanel({ groups: [], onGroupsChange });
    openSection('Groups');

    const patternInput = screen.getByPlaceholderText('src/**');
    fireEvent.change(patternInput, { target: { value: 'src/utils/**' } });
    fireEvent.click(screen.getByText('Add'));

    expect(onGroupsChange).toHaveBeenCalled();
    const calledWith = onGroupsChange.mock.calls[0][0] as IGroup[];
    expect(calledWith[0].pattern).toBe('src/utils/**');
    expect(sentMessages.some((m: unknown) => (m as { type: string }).type === 'UPDATE_GROUPS')).toBe(true);
  });

  it('removes a group and posts UPDATE_GROUPS', () => {
    const onGroupsChange = vi.fn();
    renderPanel({
      groups: [{ id: 'g1', pattern: 'src/**', color: '#00ff00' }],
      onGroupsChange,
    });
    openSection('Groups');

    const removeBtn = screen.getByTitle('Delete group');
    fireEvent.click(removeBtn);

    expect(onGroupsChange).toHaveBeenCalledWith([]);
    expect(sentMessages.some((m: unknown) => (m as { type: string }).type === 'UPDATE_GROUPS')).toBe(true);
  });
});

// ── Display: Arrows ────────────────────────────────────────────────────────

describe('SettingsPanel: Arrows toggle', () => {
  beforeEach(() => sentMessages.length = 0);

  it('renders the Show Arrows checkbox checked by default', () => {
    renderPanel({ showArrows: true });
    openSection('Display');
    const checkbox = screen.getByRole('switch', { name: /show arrows/i });
    expect(checkbox).toBeChecked();
  });

  it('unchecking arrows posts UPDATE_SHOW_ARROWS', () => {
    const onShowArrowsChange = vi.fn();
    renderPanel({ showArrows: true, onShowArrowsChange });
    openSection('Display');

    fireEvent.click(screen.getByRole('switch', { name: /show arrows/i }));

    expect(onShowArrowsChange).toHaveBeenCalledWith(false);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_ARROWS',
      payload: { showArrows: false },
    });
  });

  it('checking arrows when off posts UPDATE_SHOW_ARROWS true', () => {
    const onShowArrowsChange = vi.fn();
    renderPanel({ showArrows: false, onShowArrowsChange });
    openSection('Display');

    fireEvent.click(screen.getByRole('switch', { name: /show arrows/i }));

    expect(onShowArrowsChange).toHaveBeenCalledWith(true);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_ARROWS',
      payload: { showArrows: true },
    });
  });
});

// ── Display: Node Size ─────────────────────────────────────────────────────

describe('SettingsPanel: Node Size', () => {
  it('renders all node size options', () => {
    renderPanel();
    openSection('Display');
    expect(screen.getByRole('radio', { name: /^connections$/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^file size$/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^uniform$/i })).toBeInTheDocument();
  });

  it('selected radio matches nodeSizeMode prop', () => {
    renderPanel({ nodeSizeMode: 'file-size' });
    openSection('Display');
    expect(screen.getByRole('radio', { name: /^file size$/i })).toBeChecked();
  });

  it('changing node size calls onNodeSizeModeChange', () => {
    const onNodeSizeModeChange = vi.fn();
    renderPanel({ nodeSizeMode: 'connections', onNodeSizeModeChange });
    openSection('Display');

    fireEvent.click(screen.getByRole('radio', { name: /^uniform$/i }));
    expect(onNodeSizeModeChange).toHaveBeenCalledWith('uniform');
  });
});
