import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomAddForm } from '../../../../src/webview/components/settingsPanel/groups/CustomAddForm';
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

describe('CustomAddForm', () => {
  it('routes add-form changes through controller state setters', () => {
    const controller = buildController({ newPattern: 'src/**', newColor: '#ff00ff' });
    render(<CustomAddForm controller={controller} />);

    fireEvent.change(screen.getByPlaceholderText('src/**'), {
      target: { value: 'src/lib/**' },
    });
    fireEvent.change(screen.getByTitle('Pick color'), {
      target: { value: '#00ff00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(controller.setNewPattern).toHaveBeenCalledWith('src/lib/**');
    expect(controller.setNewColor).toHaveBeenCalledWith('#00ff00');
    expect(controller.addGroup).toHaveBeenCalled();
  });

  it('adds a group when enter is pressed and disables add for whitespace-only patterns', () => {
    const controller = buildController({ newPattern: '   ' });
    const { rerender } = render(<CustomAddForm controller={controller} />);

    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled();

    rerender(<CustomAddForm controller={buildController({ newPattern: 'src/**' })} />);
    fireEvent.keyDown(screen.getByPlaceholderText('src/**'), { key: 'Enter' });

    expect(screen.getByRole('button', { name: /^Add$/i })).not.toBeDisabled();
  });
});
