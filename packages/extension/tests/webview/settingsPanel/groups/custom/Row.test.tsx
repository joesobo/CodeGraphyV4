import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomRow } from '../../../../../src/webview/components/settingsPanel/groups/custom/Row';
import type { GroupEditorState } from '../../../../../src/webview/components/settingsPanel/groups/shared/state/useEditorState';

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

describe('CustomRow', () => {
  it('renders drag state classes and forwards drag handlers', () => {
    const controller = buildController({ dragIndex: 0, dragOverIndex: 1 });
    render(
      <ul>
        <CustomRow
          controller={controller}
          group={{ id: 'g1', pattern: '*.ts', color: '#3178C6' }}
          index={1}
          isExpanded={false}
          setExpandedGroupId={vi.fn()}
        />
      </ul>,
    );

    const row = screen.getByText('*.ts').closest('li');
    fireEvent.dragStart(row!);
    fireEvent.dragOver(row!);
    fireEvent.drop(row!);
    fireEvent.dragEnd(row!);

    expect(row).toHaveClass('bg-accent');
    expect(controller.startGroupDrag).toHaveBeenCalledWith(1);
    expect(controller.overGroupDrag).toHaveBeenCalled();
    expect(controller.dropGroup).toHaveBeenCalled();
    expect(controller.endGroupDrag).toHaveBeenCalled();
  });

  it('renders expanded editor controls and forwards edit actions', () => {
    const controller = buildController({
      localColorOverrides: { g1: '#ff00ff' },
      localPatternOverrides: { g1: '*.tsx' },
    });
    render(
      <ul>
        <CustomRow
          controller={controller}
          group={{ id: 'g1', pattern: '*.ts', color: '#3178C6' }}
          index={0}
          isExpanded={true}
          setExpandedGroupId={vi.fn()}
        />
      </ul>,
    );

    fireEvent.change(screen.getByDisplayValue('*.tsx'), {
      target: { value: '*.cts' },
    });
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'square' },
    });
    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'cube' },
    });
    fireEvent.click(screen.getByText('Choose Image...'));

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('circle');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('sphere');
    expect(controller.changeGroupPattern).toHaveBeenCalledWith('g1', '*.cts');
    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { shape2D: 'square' });
    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { shape3D: 'cube' });
    expect(controller.pickImage).toHaveBeenCalledWith('g1');
  });
});
