import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DefaultEditor,
  resolveDefaultShape2D,
  resolveDefaultShape3D,
} from '../../../../../src/webview/components/settingsPanel/groups/default/Editor';
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

describe('DefaultEditor', () => {
  it('returns the default 2D shape when a plugin group omits it', () => {
    expect(resolveDefaultShape2D({ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' })).toBe('circle');
  });

  it('returns the default 3D shape when a plugin group omits it', () => {
    expect(resolveDefaultShape3D({ id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6' })).toBe('sphere');
  });

  it('uses the default shapes in the editor selects when a plugin group omits them', () => {
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

  it('routes override actions for explicit plugin shapes', () => {
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

    expect(controller.overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { shape2D: 'square' },
    );
    expect(controller.overridePluginGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plugin:typescript:ts' }),
      { shape3D: 'cube' },
    );
  });

  it('returns explicit shapes unchanged', () => {
    const group = {
      id: 'plugin:typescript:ts',
      pattern: '*.ts',
      color: '#3178C6',
      shape2D: 'triangle' as const,
      shape3D: 'cone' as const,
    };

    expect(resolveDefaultShape2D(group)).toBe('triangle');
    expect(resolveDefaultShape3D(group)).toBe('cone');
  });
});
