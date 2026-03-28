import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../src/shared/contracts';
import { CustomGroups } from '../../../../src/webview/components/settingsPanel/groups/Custom';
import type { GroupEditorState } from '../../../../src/webview/components/settingsPanel/groups/useEditorState';

function buildController(overrides: Partial<GroupEditorState> = {}): GroupEditorState {
  return {
    customExpanded: true,
    setCustomExpanded: vi.fn(),
    expandedPluginIds: new Set(),
    newColor: '#3B82F6',
    setNewColor: vi.fn(),
    newPattern: '',
    setNewPattern: vi.fn(),
    dragIndex: null,
    dragOverIndex: null,
    localColorOverrides: {},
    localPatternOverrides: {},
    addGroup: vi.fn(),
    updateGroup: vi.fn(),
    overridePluginGroup: vi.fn(),
    changeGroupColor: vi.fn(),
    changePluginGroupColor: vi.fn(),
    changeGroupPattern: vi.fn(),
    deleteGroup: vi.fn(),
    pickImage: vi.fn(),
    clearImage: vi.fn(),
    togglePluginGroupDisabled: vi.fn(),
    togglePluginSectionDisabled: vi.fn(),
    togglePluginExpansion: vi.fn(),
    startGroupDrag: vi.fn(),
    overGroupDrag: vi.fn(),
    dropGroup: vi.fn(),
    endGroupDrag: vi.fn(),
    ...overrides,
  };
}

function renderCustomGroups({
  userGroups = [],
  expandedGroupId = null,
  controller = buildController(),
}: {
  userGroups?: IGroup[];
  expandedGroupId?: string | null;
  controller?: GroupEditorState;
} = {}) {
  const setExpandedGroupId = vi.fn();
  const result = render(
    <CustomGroups
      userGroups={userGroups}
      expandedGroupId={expandedGroupId}
      setExpandedGroupId={setExpandedGroupId}
      controller={controller}
    />
  );

  return { ...result, controller, setExpandedGroupId };
}

describe('CustomGroups', () => {
  it('renders the empty-state message when no custom groups exist', () => {
    renderCustomGroups();

    expect(screen.getByText('No custom groups.')).toBeInTheDocument();
  });

  it('renders shape and image details for a collapsed group row', () => {
    renderCustomGroups({
      userGroups: [{
        id: 'g1',
        pattern: '*.ts',
        color: '#3178C6',
        shape2D: 'diamond',
        imageUrl: 'https://example.com/icon.png',
      }],
    });

    expect(screen.getByText('diamond')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('does not render the default circle label', () => {
    renderCustomGroups({
      userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6', shape2D: 'circle' }],
    });

    expect(screen.queryByText('circle')).not.toBeInTheDocument();
  });

  it('toggles the custom section open state', () => {
    const controller = buildController();
    renderCustomGroups({ controller });

    fireEvent.click(screen.getByText('Custom'));

    expect(controller.setCustomExpanded).toHaveBeenCalledWith(false);
  });

  it('opens a group editor when the row is clicked', () => {
    const { setExpandedGroupId } = renderCustomGroups({
      userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
    });

    fireEvent.click(screen.getByText('*.ts'));

    expect(setExpandedGroupId).toHaveBeenCalledWith('g1');
  });

  it('calls updateGroup when toggling a custom group disabled', () => {
    const controller = buildController();
    renderCustomGroups({
      userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
      controller,
    });

    fireEvent.click(screen.getByTitle('Disable group'));

    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { disabled: true });
  });

  it('calls deleteGroup when deleting a custom group', () => {
    const controller = buildController();
    renderCustomGroups({
      userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
      controller,
    });

    fireEvent.click(screen.getByTitle('Delete group'));

    expect(controller.deleteGroup).toHaveBeenCalledWith('g1');
  });

  it('calls pattern, color, and shape handlers in the expanded editor', () => {
    const controller = buildController();
    const { container } = renderCustomGroups({
      userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
      expandedGroupId: 'g1',
      controller,
    });

    fireEvent.change(screen.getByDisplayValue('*.ts'), { target: { value: '*.tsx' } });
    fireEvent.change(container.querySelector('input[type="color"]')!, { target: { value: '#ff00ff' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'square' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'cube' } });

    expect(controller.changeGroupPattern).toHaveBeenCalledWith('g1', '*.tsx');
    expect(controller.changeGroupColor).toHaveBeenCalledWith('g1', '#ff00ff');
    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { shape2D: 'square' });
    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { shape3D: 'cube' });
  });

  it('renders expanded state and color overrides from controller state', () => {
    const controller = buildController({
      localColorOverrides: { g1: '#ff00ff' },
      localPatternOverrides: { g1: '*.tsx' },
    });
    const { container } = renderCustomGroups({
      userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
      expandedGroupId: 'g1',
      controller,
    });

    expect(screen.getByText('*.ts').closest('li')).toHaveClass('bg-accent/50');
    expect(screen.getByDisplayValue('*.tsx')).toBeInTheDocument();
    expect(container.querySelector('span[style]')).toHaveStyle({ backgroundColor: '#ff00ff' });
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('circle');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('sphere');
  });

  it('calls pickImage when choosing a group image', () => {
    const controller = buildController();
    renderCustomGroups({
      userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
      expandedGroupId: 'g1',
      controller,
    });

    fireEvent.click(screen.getByText('Choose Image...'));

    expect(controller.pickImage).toHaveBeenCalledWith('g1');
  });

  it('calls clearImage when clearing an existing image', () => {
    const controller = buildController();
    renderCustomGroups({
      userGroups: [{
        id: 'g1',
        pattern: '*.ts',
        color: '#3178C6',
        imageUrl: 'https://example.com/icon.png',
      }],
      expandedGroupId: 'g1',
      controller,
    });

    fireEvent.click(screen.getByText('Clear'));

    expect(controller.clearImage).toHaveBeenCalledWith('g1');
  });

  it('routes add-form changes through controller state setters', () => {
    const controller = buildController({ newPattern: 'src/**', newColor: '#ff00ff' });
    const { container } = renderCustomGroups({ controller });

    fireEvent.change(screen.getByPlaceholderText('src/**'), { target: { value: 'src/lib/**' } });
    fireEvent.change(container.querySelector('input[title="Pick color"]')!, { target: { value: '#00ff00' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(controller.setNewPattern).toHaveBeenCalledWith('src/lib/**');
    expect(controller.setNewColor).toHaveBeenCalledWith('#00ff00');
    expect(controller.addGroup).toHaveBeenCalled();
  });

  it('adds a group when enter is pressed in the add form', () => {
    const controller = buildController({ newPattern: 'src/**' });
    renderCustomGroups({ controller });

    fireEvent.keyDown(screen.getByPlaceholderText('src/**'), { key: 'Enter' });

    expect(controller.addGroup).toHaveBeenCalled();
  });

  it('disables the add button for whitespace-only patterns', () => {
    renderCustomGroups({ controller: buildController({ newPattern: '   ' }) });

    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled();
  });

  it('applies drag state classes and forwards drag handlers', () => {
    const controller = buildController({ dragIndex: 0, dragOverIndex: 1 });
    renderCustomGroups({
      userGroups: [
        { id: 'g1', pattern: '*.ts', color: '#3178C6' },
        { id: 'g2', pattern: '*.tsx', color: '#22C55E', disabled: true },
      ],
      controller,
    });

    const firstRow = screen.getByText('*.ts').closest('li');
    const secondRow = screen.getByText('*.tsx').closest('li');

    expect(firstRow).toHaveClass('opacity-40');
    expect(secondRow).toHaveClass('bg-accent');
    expect(secondRow).toHaveClass('opacity-50');

    fireEvent.dragStart(firstRow!);
    fireEvent.dragOver(secondRow!);
    fireEvent.drop(secondRow!);
    fireEvent.dragEnd(firstRow!);

    expect(controller.startGroupDrag).toHaveBeenCalledWith(0);
    expect(controller.overGroupDrag).toHaveBeenCalled();
    expect(controller.dropGroup).toHaveBeenCalled();
    expect(controller.endGroupDrag).toHaveBeenCalled();
  });
});
