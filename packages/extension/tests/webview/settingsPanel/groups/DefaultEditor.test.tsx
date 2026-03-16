import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefaultEditor } from '../../../../src/webview/components/settingsPanel/groups/DefaultEditor';
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

describe('DefaultEditor', () => {
  it('falls back to default shapes when plugin groups omit them', () => {
    render(
      <DefaultEditor
        controller={buildController()}
        displayColor="#3178C6"
        group={{ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' }}
      />,
    );

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('circle');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('sphere');
  });

  it('preserves explicit shapes and routes override actions', () => {
    const controller = buildController();

    render(
      <DefaultEditor
        controller={controller}
        displayColor="#ff00ff"
        group={{
          id: 'plugin:typescript:ts',
          pattern: '*.ts',
          color: '#3178C6',
          shape2D: 'triangle',
          shape3D: 'cone',
        }}
      />,
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'square' },
    });
    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'cube' },
    });

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('triangle');
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('cone');
    expect(controller.overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { shape2D: 'square' },
    );
    expect(controller.overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { shape3D: 'cube' },
    );
  });
});
