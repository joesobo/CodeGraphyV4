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

  // Open the panel
  const result = render(<SettingsPanel {...props} />);
  fireEvent.click(screen.getByTitle('Settings'));
  return { ...result, props };
}

function makeProps(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}): Parameters<typeof SettingsPanel>[0] {
  return {
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

  it('posts REFRESH_GRAPH when reset button is clicked', () => {
    render(<SettingsPanel {...makeProps()} />);
    fireEvent.click(screen.getByTitle('Reset Graph'));
    expect(sentMessages).toContainEqual({ type: 'REFRESH_GRAPH' });
  });
});

describe('SettingsPanel: Physics persistence', () => {
  beforeEach(() => sentMessages.length = 0);

  it('debounces UPDATE_PHYSICS_SETTING while applying immediate local updates', () => {
    vi.useFakeTimers();
    const onSettingsChange = vi.fn();
    const { container } = renderPanel({ onSettingsChange });

    const repelSlider = Array.from(container.querySelectorAll('input[type="range"]')).find(
      (el) =>
        el.getAttribute('min') === '0' &&
        el.getAttribute('max') === '20' &&
        el.getAttribute('step') === '1'
    );

    expect(repelSlider).toBeTruthy();

    fireEvent.change(repelSlider!, { target: { value: '6' } });
    fireEvent.change(repelSlider!, { target: { value: '7' } });
    fireEvent.change(repelSlider!, { target: { value: '8' } });

    expect(onSettingsChange).toHaveBeenCalledTimes(3);
    expect(
      sentMessages.filter((msg) => (msg as { type?: string }).type === 'UPDATE_PHYSICS_SETTING')
    ).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(
      sentMessages.filter((msg) => (msg as { type?: string }).type === 'UPDATE_PHYSICS_SETTING')
    ).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const physicsMessages = sentMessages.filter(
      (msg) => (msg as { type?: string }).type === 'UPDATE_PHYSICS_SETTING'
    );
    expect(physicsMessages).toHaveLength(1);
    expect(physicsMessages[0]).toEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'repelForce', value: 8 },
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
    const checkbox = screen.getByRole('checkbox', { name: /show arrows/i });
    expect(checkbox).toBeChecked();
  });

  it('unchecking arrows posts UPDATE_SHOW_ARROWS', () => {
    const onShowArrowsChange = vi.fn();
    renderPanel({ showArrows: true, onShowArrowsChange });
    openSection('Display');

    fireEvent.click(screen.getByRole('checkbox', { name: /show arrows/i }));

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

    fireEvent.click(screen.getByRole('checkbox', { name: /show arrows/i }));

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
