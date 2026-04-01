import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../src/webview/store/state';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

const sliderHarness = vi.hoisted(() => ({
  onValueChange: null as null | ((value: number[]) => void),
}));

// Mock Slider so we can trigger onValueChange directly
vi.mock('../../../src/webview/components/ui/controls/slider', () => ({
  Slider: (props: { value: number[]; onValueChange: (value: number[]) => void; min: number; max: number; step: number; className: string }) => {
    sliderHarness.onValueChange = props.onValueChange;
    return (
      <input
        data-testid="depth-slider"
        type="range"
        min={props.min}
        max={props.max}
        value={props.value[0]}
        onChange={(e) => props.onValueChange([Number(e.target.value)])}
      />
    );
  },
}));

import { postMessage } from '../../../src/webview/vscodeApi';
import { ViewButtons } from '../../../src/webview/components/toolbar/ViewButtons';

function createAvailableView(id: string, name: string) {
  return {
    id,
    name,
    icon: 'codicon-symbol-file',
    description: name,
    active: false,
  };
}

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <ViewButtons />
    </TooltipProvider>,
  );
}

describe('ViewButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sliderHarness.onValueChange = null;
    graphStore.setState({
      availableViews: [],
      activeViewId: 'codegraphy.connections',
      depthLimit: 1,
    });
  });

  it('does not render view buttons when availableViews is empty', () => {
    graphStore.setState({ availableViews: [] });
    renderWithProviders();
    expect(screen.queryByTestId('view-buttons')).not.toBeInTheDocument();
  });

  it('renders view buttons when availableViews has entries', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.connections', 'Connections'),
        createAvailableView('codegraphy.folder', 'Folder'),
      ],
    });
    renderWithProviders();
    expect(screen.getByTestId('view-buttons')).toBeInTheDocument();
  });

  it('renders a button for each available view', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.connections', 'Connections'),
        createAvailableView('codegraphy.depth-graph', 'Depth'),
        createAvailableView('codegraphy.folder', 'Folder'),
      ],
    });
    renderWithProviders();
    const buttons = screen.getByTestId('view-buttons').querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('sends CHANGE_VIEW message when a view button is clicked', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.connections', 'Connections'),
        createAvailableView('codegraphy.folder', 'Folder'),
      ],
    });
    renderWithProviders();

    const buttons = screen.getByTestId('view-buttons').querySelectorAll('button');
    fireEvent.click(buttons[1]);

    expect(postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_VIEW',
      payload: { viewId: 'codegraphy.folder' },
    });
  });

  it('renders known view icons as SVG paths', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.connections', 'Connections'),
      ],
    });
    const { container } = renderWithProviders();
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders first letter of name for unknown view IDs', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('custom.unknown-view', 'Zzz Custom View'),
      ],
    });
    renderWithProviders();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('renders first letter with text-xs class for fallback icon', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('custom.unknown-view', 'Zzz Custom View'),
      ],
    });
    renderWithProviders();
    const letterSpan = screen.getByText('Z');
    expect(letterSpan.className).toContain('text-xs');
  });

  it('shows depth slider only when depth view is active', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.depth-graph', 'Depth'),
      ],
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 3,
    });
    renderWithProviders();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not render the depth slider when depth view is not active', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.connections', 'Connections'),
        createAvailableView('codegraphy.depth-graph', 'Depth'),
      ],
      activeViewId: 'codegraphy.connections',
      depthLimit: 2,
    });
    renderWithProviders();
    expect(screen.queryByTestId('depth-slider')).not.toBeInTheDocument();
  });

  it('sets opacity to 1 and maxWidth to 8rem when depth view is active', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.depth-graph', 'Depth'),
      ],
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 1,
    });
    const { container } = renderWithProviders();
    const sliderContainer = container.querySelector('[style*="max-width"]') as HTMLElement | null;
    expect(sliderContainer).not.toBeNull();
    expect(sliderContainer!.style.opacity).toBe('1');
    expect(sliderContainer!.style.maxWidth).toBe('8rem');
  });

  it('applies default variant to the active view button', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.connections', 'Connections'),
        createAvailableView('codegraphy.folder', 'Folder'),
      ],
      activeViewId: 'codegraphy.connections',
    });
    renderWithProviders();
    const buttons = screen.getByTestId('view-buttons').querySelectorAll('button');
    // Active and inactive buttons should have different styling
    const activeButton = buttons[0];
    const inactiveButton = buttons[1];
    expect(activeButton.className).not.toBe(inactiveButton.className);
  });

  it('displays the current depth limit as text', () => {
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.depth-graph', 'Depth'),
      ],
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 4,
    });
    renderWithProviders();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

describe('ViewButtons depth slider interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sliderHarness.onValueChange = null;
    graphStore.setState({
      availableViews: [
        createAvailableView('codegraphy.depth-graph', 'Depth'),
      ],
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 2,
    });
  });

  it('sends CHANGE_DEPTH_LIMIT when the depth slider value changes', () => {
    renderWithProviders();
    expect(sliderHarness.onValueChange).not.toBeNull();
    sliderHarness.onValueChange!([4]);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 4 },
    });
  });

  it('passes the first element of the value array as depthLimit', () => {
    renderWithProviders();
    sliderHarness.onValueChange!([3]);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 3 },
    });
  });

  it('sends the correct depth limit for boundary values', () => {
    renderWithProviders();
    sliderHarness.onValueChange!([1]);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 1 },
    });
    vi.clearAllMocks();
    sliderHarness.onValueChange!([5]);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_DEPTH_LIMIT',
      payload: { depthLimit: 5 },
    });
  });
});

describe('ViewButtons availableViews guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    graphStore.setState({
      availableViews: [],
      activeViewId: 'codegraphy.connections',
      depthLimit: 1,
    });
  });

  it('does not render the view-buttons container when length is 0', () => {
    graphStore.setState({ availableViews: [] });
    renderWithProviders();
    expect(screen.queryByTestId('view-buttons')).not.toBeInTheDocument();
  });

  it('renders the view-buttons container when length is 1', () => {
    graphStore.setState({
      availableViews: [{ id: 'codegraphy.connections', name: 'Connections', icon: 'symbol-file', description: 'Shows all files', active: true }],
    });
    renderWithProviders();
    expect(screen.getByTestId('view-buttons')).toBeInTheDocument();
  });

  it('keeps the view-buttons container inline without toolbar chrome', () => {
    graphStore.setState({
      availableViews: [{ id: 'codegraphy.connections', name: 'Connections', icon: 'symbol-file', description: 'Shows all files', active: true }],
    });
    renderWithProviders();
    const container = screen.getByTestId('view-buttons');
    expect(container.className).toContain('flex-col');
    expect(container.className).not.toContain('border');
    expect(container.className).not.toContain('rounded');
  });
});
