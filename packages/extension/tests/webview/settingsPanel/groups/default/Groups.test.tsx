import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefaultGroups } from '../../../../../src/webview/components/settingsPanel/groups/default/List';
import type { SettingsPanelGroupSection } from '../../../../../src/webview/components/settingsPanel/groups/shared/sections';
import type { GroupEditorState } from '../../../../../src/webview/components/settingsPanel/groups/shared/state/useEditorState';

function buildController(overrides: Partial<GroupEditorState> = {}): GroupEditorState {
  return {
    customExpanded: true,
    setCustomExpanded: vi.fn(),
    expandedPluginIds: new Set(['typescript']),
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

function renderDefaultGroups({
  defaultSections,
  expandedGroupId = null,
  controller = buildController(),
}: {
  defaultSections: SettingsPanelGroupSection[];
  expandedGroupId?: string | null;
  controller?: GroupEditorState;
}) {
  const setExpandedGroupId = vi.fn();
  const result = render(
    <DefaultGroups
      defaultSections={defaultSections}
      expandedGroupId={expandedGroupId}
      setExpandedGroupId={setExpandedGroupId}
      controller={controller}
    />
  );

  return { ...result, controller, setExpandedGroupId };
}

describe('DefaultGroups', () => {
  it('renders section names and counts', () => {
    renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
      }],
    });

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('applies disabled styling when every group in a section is disabled', () => {
    renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', disabled: true }],
      }],
    });

    expect(screen.getByText('TypeScript').closest('div')?.parentElement).toHaveClass('opacity-50');
  });

  it('keeps the section enabled when at least one group is still enabled', () => {
    renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [
          { id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', disabled: true },
          { id: 'plugin:typescript:tsx', pattern: '*.tsx', color: '#22C55E' },
        ],
      }],
    });

    expect(screen.getByText('TypeScript').closest('div')?.parentElement).not.toHaveClass('opacity-50');
    expect(screen.getByTitle('Disable all TypeScript groups')).toBeInTheDocument();
  });

  it('toggles plugin section expansion and section visibility', () => {
    const controller = buildController();
    renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
      }],
      controller,
    });

    fireEvent.click(screen.getByText('TypeScript'));
    fireEvent.click(screen.getByTitle('Disable all TypeScript groups'));

    expect(controller.togglePluginExpansion).toHaveBeenCalledWith('typescript');
    expect(controller.togglePluginSectionDisabled).toHaveBeenCalledWith('typescript', true);
  });

  it('opens a default group editor when the row is clicked', () => {
    const { setExpandedGroupId } = renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
      }],
    });

    fireEvent.click(screen.getByText('*.ts'));

    expect(setExpandedGroupId).toHaveBeenCalledWith('plugin:typescript:ts');
  });

  it('calls the plugin group visibility handler', () => {
    const controller = buildController();
    renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
      }],
      controller,
    });

    fireEvent.click(screen.getByTitle('Disable group'));

    expect(controller.togglePluginGroupDisabled).toHaveBeenCalledWith('plugin:typescript:ts', true);
  });

  it('renders image and helper text for an expanded default group', () => {
    renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{
          id: 'plugin:typescript:ts',
          pattern: '*.ts',
          color: '#3178C6',
          imageUrl: 'https://example.com/icon.png',
        }],
      }],
      expandedGroupId: 'plugin:typescript:ts',
    });

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/icon.png');
    expect(screen.getByText('Editing will create a custom override')).toBeInTheDocument();
  });

  it('renders color overrides and default shape values for expanded plugin groups', () => {
    const controller = buildController({
      localColorOverrides: { 'plugin:typescript:ts': '#ff00ff' },
    });
    const { container } = renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
      }],
      expandedGroupId: 'plugin:typescript:ts',
      controller,
    });

    expect(container.querySelector('span[style]')).toHaveStyle({ backgroundColor: '#ff00ff' });
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('circle');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('sphere');
  });

  it('routes plugin override controls through the controller', () => {
    const controller = buildController();
    const { container } = renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }],
      }],
      expandedGroupId: 'plugin:typescript:ts',
      controller,
    });

    fireEvent.change(container.querySelector('input[type="color"]')!, { target: { value: '#ff00ff' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'square' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'cube' } });

    expect(controller.changePluginGroupColor).toHaveBeenCalled();
    expect(controller.overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { shape2D: 'square' }
    );
    expect(controller.overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { shape3D: 'cube' }
    );
  });

  it('applies expanded and disabled row classes for plugin groups', () => {
    renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', disabled: true }],
      }],
      expandedGroupId: 'plugin:typescript:ts',
    });

    expect(screen.getByText('*.ts').closest('li')).toHaveClass('bg-accent/50');
    expect(screen.getByText('*.ts').closest('li')).toHaveClass('opacity-50');
  });

  it('uses the enabled-group title when a plugin group is disabled', () => {
    renderDefaultGroups({
      defaultSections: [{
        sectionId: 'typescript',
        sectionName: 'TypeScript',
        groups: [{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', disabled: true }],
      }],
    });

    expect(screen.getByTitle('Enable group')).toBeInTheDocument();
  });
});
