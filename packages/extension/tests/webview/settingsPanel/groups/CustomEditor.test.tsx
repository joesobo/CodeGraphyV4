import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomEditor } from '../../../../src/webview/components/settingsPanel/groups/CustomEditor';
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

describe('CustomEditor', () => {
  it('falls back to default shapes when the group does not define them', () => {
    render(
      <CustomEditor
        controller={buildController()}
        displayColor="#3178C6"
        group={{ id: 'g1', pattern: '*.ts', color: '#3178C6' }}
      />,
    );

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('circle');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('sphere');
  });

  it('preserves explicit shapes and forwards editor actions', () => {
    const controller = buildController({
      localPatternOverrides: { g1: '*.tsx' },
    });

    render(
      <CustomEditor
        controller={controller}
        displayColor="#ff00ff"
        group={{
          id: 'g1',
          pattern: '*.ts',
          color: '#3178C6',
          shape2D: 'triangle',
          shape3D: 'cone',
          imageUrl: 'https://example.com/icon.png',
        }}
      />,
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
    fireEvent.click(screen.getByText('Clear'));

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('triangle');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('cone');
    expect(controller.changeGroupPattern).toHaveBeenCalledWith('g1', '*.cts');
    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { shape2D: 'square' });
    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { shape3D: 'cube' });
    expect(controller.clearImage).toHaveBeenCalledWith('g1');
  });
});
