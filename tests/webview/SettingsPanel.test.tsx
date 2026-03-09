/**
 * @fileoverview Tests for the SettingsPanel component.
 * Covers: filter patterns, color groups, orphan toggle, arrows toggle, node size.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SettingsPanel from '../../src/webview/components/SettingsPanel';
import { graphStore } from '../../src/webview/store';
import type { IPhysicsSettings } from '../../src/shared/types';

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

/** Set store state before rendering */
function setStoreState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    physicsSettings: DEFAULT_PHYSICS,
    groups: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    showOrphans: true,
    nodeSizeMode: 'connections',
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    depthLimit: 1,
    showArrows: true,
    showLabels: true,
    graphMode: '2d',
    maxFiles: 500,
    ...overrides,
  });
}

function openSection(label: string) {
  const btn = screen.getByText(label);
  fireEvent.click(btn);
}

function renderPanel(storeOverrides: Record<string, unknown> = {}) {
  setStoreState(storeOverrides);
  const onClose = vi.fn();
  const result = render(<SettingsPanel isOpen={true} onClose={onClose} />);
  return { ...result, onClose };
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
    renderPanel({ filterPatterns: [] });
    openSection('Filters');

    const input = screen.getByPlaceholderText('*.png');
    fireEvent.change(input, { target: { value: '**/*.log' } });
    fireEvent.click(screen.getByText('Add'));

    expect(graphStore.getState().filterPatterns).toEqual(['**/*.log']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['**/*.log'] },
    });
  });

  it('removes a filter pattern and posts UPDATE_FILTER_PATTERNS', () => {
    renderPanel({ filterPatterns: ['**/*.log'] });
    openSection('Filters');

    const removeBtn = screen.getByTitle('Delete pattern');
    fireEvent.click(removeBtn);

    expect(graphStore.getState().filterPatterns).toEqual([]);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: [] },
    });
  });

  it('shows orphan toggle and posts UPDATE_SHOW_ORPHANS', () => {
    renderPanel({ showOrphans: true });
    openSection('Filters');

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(graphStore.getState().showOrphans).toBe(false);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_ORPHANS',
      payload: { showOrphans: false },
    });
  });
});

describe('SettingsPanel: Quick Actions', () => {
  beforeEach(() => sentMessages.length = 0);

  it('calls onClose when close button is clicked', () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('returns null when isOpen is false', () => {
    setStoreState();
    const { container } = render(<SettingsPanel isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('SettingsPanel: Physics persistence', () => {
  beforeEach(() => sentMessages.length = 0);

  it('applies local updates on slider interaction and persists physics settings', () => {
    vi.useFakeTimers();
    renderPanel();

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

    // Local state update fired immediately (store updated)
    expect(graphStore.getState().physicsSettings.repelForce).toBe(6);

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
    renderPanel({ groups: [] });
    openSection('Groups');

    const patternInput = screen.getByPlaceholderText('src/**');
    fireEvent.change(patternInput, { target: { value: 'src/utils/**' } });
    fireEvent.click(screen.getByText('Add'));

    const groups = graphStore.getState().groups;
    expect(groups.length).toBe(1);
    expect(groups[0].pattern).toBe('src/utils/**');
    expect(sentMessages.some((m: unknown) => (m as { type: string }).type === 'UPDATE_GROUPS')).toBe(true);
  });

  it('removes a group and posts UPDATE_GROUPS', () => {
    renderPanel({
      groups: [{ id: 'g1', pattern: 'src/**', color: '#00ff00' }],
    });
    openSection('Groups');

    const removeBtn = screen.getByTitle('Delete group');
    fireEvent.click(removeBtn);

    expect(graphStore.getState().groups).toEqual([]);
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
    renderPanel({ showArrows: true });
    openSection('Display');

    fireEvent.click(screen.getByRole('switch', { name: /show arrows/i }));

    expect(graphStore.getState().showArrows).toBe(false);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_ARROWS',
      payload: { showArrows: false },
    });
  });

  it('checking arrows when off posts UPDATE_SHOW_ARROWS true', () => {
    renderPanel({ showArrows: false });
    openSection('Display');

    fireEvent.click(screen.getByRole('switch', { name: /show arrows/i }));

    expect(graphStore.getState().showArrows).toBe(true);
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

  it('selected radio matches nodeSizeMode from store', () => {
    renderPanel({ nodeSizeMode: 'file-size' });
    openSection('Display');
    expect(screen.getByRole('radio', { name: /^file size$/i })).toBeChecked();
  });

  it('changing node size updates store', () => {
    renderPanel({ nodeSizeMode: 'connections' });
    openSection('Display');

    fireEvent.click(screen.getByRole('radio', { name: /^uniform$/i }));
    expect(graphStore.getState().nodeSizeMode).toBe('uniform');
  });
});
