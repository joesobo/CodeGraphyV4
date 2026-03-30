import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CustomEditor,
  resolveCustomShape2D,
  resolveCustomShape3D,
} from '../../../../../src/webview/components/settingsPanel/groups/custom/Editor';
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

describe('CustomEditor', () => {
  it('returns the default 2D shape when a custom group omits it', () => {
    expect(resolveCustomShape2D({ id: 'g1', pattern: '*.ts', color: '#3178C6' })).toBe('circle');
  });

  it('returns the default 3D shape when a custom group omits it', () => {
    expect(resolveCustomShape3D({ id: 'g1', pattern: '*.ts', color: '#3178C6' })).toBe('sphere');
  });

  it('uses the default shapes in the editor selects when a custom group omits them', () => {
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

  it('forwards editor actions for explicit shapes and images', () => {
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

    expect(controller.changeGroupPattern).toHaveBeenCalledWith('g1', '*.cts');
    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { shape2D: 'square' });
    expect(controller.updateGroup).toHaveBeenCalledWith('g1', { shape3D: 'cube' });
    expect(controller.clearImage).toHaveBeenCalledWith('g1');
  });

  it('returns explicit shapes unchanged', () => {
    const group = {
      id: 'g1',
      pattern: '*.ts',
      color: '#3178C6',
      shape2D: 'triangle' as const,
      shape3D: 'cone' as const,
    };

    expect(resolveCustomShape2D(group)).toBe('triangle');
    expect(resolveCustomShape3D(group)).toBe('cone');
  });
});
